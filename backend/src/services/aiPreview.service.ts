import {Request} from 'express';
import httpStatus from 'http-status';
import sharp from 'sharp';
import {PreviewStatus} from '@prisma/client';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import {readStoredImage, storeGenerated} from '../utils/fileStore';
import {config, logger} from '@config/index';
import shopProductService, {ProductScope} from './shopProduct.service';
import {Photo, checkRecolour, compositeGarment, garmentColour, loadPhoto, recolourGarment, segmentGarment, studioPhoto, toJpeg} from '../utils/recolour';

/*
 * AI color previews (Cloudflare Workers AI, FLUX.2 image editing).
 * The uploaded product image is only read: each preview is a new file and a
 * ProductColorPreview row, one per (product, color, source image).
 */

// FLUX.2 [klein] only accepts input images smaller than 512x512
const INPUT_MAX = 511;
const OUTPUT_SIZE = 1024;
const TIMEOUT_MS = 90_000;
/** Pause before trying again after a Cloudflare server error */
const RETRY_PAUSE_MS = 2_000;

class QuotaError extends Error {}
class TokenError extends Error {}
/** Cloudflare's own failure (HTTP 5xx): usually gone on the next try */
class ServerError extends Error {}

const promptFor = (colorName: string, hex: string) =>
    [
        `Professional e-commerce product photo of the exact garment from image 0, recoloured to ${colorName} (${hex.toUpperCase()}).`,
        'Keep the garment identical: same design, cut, silhouette, stitching, seams, pattern, print, fabric texture, buttons, logos and proportions.',
        'Change only the main fabric colour.',
        'Plain warm ivory studio backdrop (#F3F0EA), soft diffused lighting, subtle natural shadow, sharp focus, editorial fashion catalogue style.',
    ].join(' ');

/**
 * The model returns a square image, so the photo is padded to a square first
 * (and the result cropped back), otherwise the garment would be stretched.
 */
const squareOf = (photo: Photo) => {
    const side = Math.max(photo.width, photo.height);
    return {side, left: Math.floor((side - photo.width) / 2), top: Math.floor((side - photo.height) / 2)};
};
const toModelInput = (photo: Photo) => {
    const sq = squareOf(photo);
    return sharp(photo.data, {raw: {width: photo.width, height: photo.height, channels: 3}})
        .extend({top: sq.top, bottom: sq.side - photo.height - sq.top, left: sq.left, right: sq.side - photo.width - sq.left, background: '#ffffff'})
        .resize(INPUT_MAX, INPUT_MAX)
        .png()
        .toBuffer();
};
/** The model's square output, back to the photo's own shape and size */
const fromModelOutput = async (photo: Photo, base64: string) => {
    const sq = squareOf(photo);
    return sharp(Buffer.from(base64, 'base64'))
        .resize(sq.side, sq.side, {fit: 'fill'})
        .extract({left: sq.left, top: sq.top, width: photo.width, height: photo.height})
        .png()
        .toBuffer();
};

export const PHOTO_STYLES = ['GHOST', 'MANNEQUIN', 'MODEL', 'ENHANCE'] as const;
export type PhotoStyle = (typeof PHOTO_STYLES)[number];

/**
 * Garment family, read from the product name, subcategory, category, product
 * type and the shop's notes. It decides what must be kept, how the garment is
 * shaped, worn or paired, and which mannequin fits it. Order matters: the more
 * specific words are tested first ("shirt dress" is a dress, "sweatshirt" a knit).
 */
type Family = 'saree' | 'lehenga' | 'dupatta' | 'kurta' | 'dress' | 'jacket' | 'knit' | 'tshirt' | 'shirt' | 'bottom' | 'other';

const familyOf = (text: string, gender: string): Family => {
    const t = text.toLowerCase();
    if (/\bsarees?\b|\bsaris?\b/.test(t)) return 'saree';
    if (/lehenga|ghagra|chaniya|choli/.test(t)) return 'lehenga';
    if (/dupatta|stole|shawl|scarf/.test(t)) return 'dupatta';
    if (/kurta|kurti|anarkali|salwar|churidar|sherwani/.test(t)) return 'kurta';
    // A "suit" is a salwar suit for women and girls, a two-piece suit for men and boys
    if (/\bsuits?\b/.test(t)) return gender === 'MEN' || gender === 'BOYS' ? 'jacket' : 'kurta';
    if (/dress|gown|frock|maxi|jumpsuit|dungaree/.test(t)) return 'dress';
    if (/jacket|blazer|coat|waistcoat|bomber|windcheater|shacket/.test(t)) return 'jacket';
    if (/sweater|hoodie|sweatshirt|cardigan|pullover|jumper|knit/.test(t)) return 'knit';
    if (/t-?shirt|\btees?\b|polo|tank|crop ?top|\btops?\b/.test(t)) return 'tshirt';
    if (/shirt|blouse/.test(t)) return 'shirt';
    if (/jeans?\b|denim|trouser|pant|chino|jogger|shorts?\b|legging|palazzo|skirt|cargo|track/.test(t)) return 'bottom';
    return 'other';
};

/** Worn from the shoulders to below the knee: shown full length, on a full-body form */
const FULL_LENGTH: Family[] = ['saree', 'lehenga', 'dress', 'kurta'];
/** Worn on the upper body: framed from the head to above the knee, paired with plain trousers */
const TOPS: Family[] = ['shirt', 'tshirt', 'knit', 'jacket', 'other'];

/**
 * The details of each family that must survive the redraw (after design and colour, which come first).
 * Worded as "the same X as image 0" and never as a part to show ("every button", "any pocket"):
 * naming a part makes the model draw it even when the garment has none (seen in testing).
 */
const KEEP: Record<Family, string> = {
    shirt: 'the same collar shape, front opening and fastening, cuffs, sleeve length and fit',
    tshirt: 'the same neckline, sleeve length and hems, and any print in the same place and size',
    knit: 'the same knit or fleece texture and thickness, the same neckline, cuffs and hem',
    bottom: 'the same waistband and fastening, the same topstitching, leg shape, length and hems',
    dress: "the same silhouette, neckline, sleeve style, waistline and length, and the fabric's natural flow",
    jacket: 'the same fastening, collar or lapels, seams and structured shape',
    kurta: 'the same neckline and opening, sleeve length, side slits and full length',
    saree: 'the same border, pallu design, motifs across the main fabric and zari work, each in its original place',
    lehenga: 'the same skirt flare and border, the same blouse (choli) and dupatta',
    dupatta: 'the same border, print and edging',
    other: 'the same shape and construction',
};

/** How a saree / lehenga / dupatta / kurta is worn, so the AI drapes it properly */
const drapeHint = (family: Family) =>
    family === 'saree' ? 'The saree is draped in the traditional Nivi style: neat front pleats, the pallu over the left shoulder, the border and pallu design clearly visible.'
    : family === 'lehenga' ? 'The lehenga skirt shows its full flare, with the matching blouse (choli) and the dupatta draped over one shoulder.'
    : family === 'dupatta' ? 'The dupatta is draped over both shoulders so its border and print are visible.'
    : family === 'kurta' ? 'The kurta falls straight to its full length with its natural fall.'
    : '';

/** Who wears it, from the product's gender (adults for adult wear, children of a suitable age for kidswear) */
const wearer = (gender: string) =>
    gender === 'MEN' ? {who: "men's", model: 'an adult Indian male fashion model'}
    : gender === 'WOMEN' ? {who: "women's", model: 'an adult Indian female fashion model'}
    : gender === 'BOYS' ? {who: "boys'", model: 'an Indian boy about 8 years old'}
    : gender === 'GIRLS' ? {who: "girls'", model: 'an Indian girl about 8 years old'}
    : gender === 'KIDS' ? {who: "kids'", model: 'an Indian child about 6 years old'}
    : {who: '', model: 'an adult Indian fashion model'};

/** Shape of the mannequin, so a women's kurta is not put on a men's form, or kidswear on an adult one */
const formShape = (gender: string) =>
    gender === 'WOMEN' ? 'female'
    : gender === 'MEN' ? 'male'
    : gender === 'BOYS' || gender === 'GIRLS' || gender === 'KIDS' ? 'child-size'
    : '';

export type GarmentBrief = {
    gender: string;
    kind: string;
    colour: {name: string; hex: string};
    details?: string;
    /** Category name and product type, e.g. "Trousers, pant": only used to tell the garment family */
    category?: string;
};

/** "Enhance" style: the shop's own garment ironed, arranged and shot in a studio (no person, no mannequin) */
const ENHANCE_PROMPT = `Transform the uploaded clothing photograph into premium, professional e-commerce product photography.

Act as an expert fashion product stylist, garment preparation specialist, and professional commercial photographer.

IMPORTANT: The original uploaded image is the ONLY source of truth for the product.

1. VIRTUAL IRONING AND WRINKLE REMOVAL

Before creating the final photograph, professionally prepare the garment:

- Remove unwanted wrinkles, creases, and accidental folds.
- Smooth uneven fabric surfaces.
- Make the garment appear freshly ironed and professionally steamed.
- Remove unwanted compression marks and messy folds.
- Restore a neat, natural fabric appearance.
- Maintain authentic fabric texture and material characteristics.
- Do not make the fabric look artificially smooth or plastic.

2. AUTOMATIC GARMENT POSITION CORRECTION

Analyze the garment's current position and correct its presentation.

- Straighten the garment.
- Center it within the image.
- Correct tilted or uneven positioning.
- Arrange sleeves naturally and symmetrically.
- Separate crossed or overlapping sleeves when possible.
- Straighten the collar and neckline.
- Align the shoulders.
- Make the left and right sides look naturally balanced.
- Straighten the bottom hem.
- Correct accidental folds and twisted fabric.
- Ensure the complete product is visible.
- Maintain realistic garment proportions.

The garment should look like a professional stylist carefully arranged it before taking a catalog photograph.

3. PRODUCT IDENTITY PRESERVATION

ABSOLUTELY DO NOT CHANGE:

- Original product color and shades.
- Fabric type and texture.
- Stitching and seams.
- Printed patterns and embroidery.
- Buttons, zippers, pockets, and collars.
- Sleeve design and length.
- Logos and original branding.
- Product construction and proportions.

Never invent missing product details or redesign the garment.

4. BACKGROUND REPLACEMENT

- Remove the original floor, furniture, cloth, and distracting objects.
- Replace the background with a clean professional photography studio.
- Use a premium white, warm white, or light grey background.
- Add realistic soft shadows beneath the product.
- Create natural depth and balanced studio lighting.
- Remove unwanted background reflections and color casts.

5. PROFESSIONAL PRODUCT PRESENTATION

Make the garment look like a premium online fashion store catalog photograph.

- Professional front-facing product presentation.
- Proper garment alignment.
- Clean and symmetrical composition.
- Realistic fabric folds.
- Sharp details and natural colors.
- Balanced exposure and lighting.
- High-quality commercial photography appearance.

6. STRICT NEGATIVE INSTRUCTIONS

NEVER:

- Change the original garment design.
- Change fabric color.
- Invent embroidery or patterns.
- Remove original design elements.
- Add artificial stitching.
- Change the garment's shape or proportions.
- Create additional sleeves or collars.
- Generate fake logos.
- Replace the actual garment with a similar-looking garment.
- Over-smooth or destroy the fabric texture.
- Crop important product details.

FINAL OBJECTIVE

Convert an ordinary, poorly arranged, wrinkled mobile phone photograph into a professionally prepared, virtually ironed, correctly positioned, premium e-commerce product photograph.

The final result should look as if the actual garment was professionally ironed, carefully arranged by a fashion stylist, and photographed inside a commercial product photography studio.

Product authenticity is more important than visual creativity.`;

/*
 * Prompts for the AI catalogue photos.
 *
 * FLUX.2 [klein] pays most attention to what comes first and has no negative
 * prompt: naming a thing ("no mannequin") tends to draw it. So each prompt says
 * what the picture IS, in this order: the shot and the garment, keeping the
 * garment identical, the style's shape or fit, the garment's preparation, then
 * the backdrop and light. Each style only describes its own subject: GHOST never
 * mentions a person or mannequin, MANNEQUIN shows a form, MODEL a person.
 */

/**
 * "women's Maroon (#7A2232) Silk Kurta (zari border)": the colour is measured from the photo.
 * `skipUnmeasured` drops the "same colour as the photo" placeholder; ENHANCE keeps its original line.
 */
const garmentLine = (g: GarmentBrief, skipUnmeasured = false) => {
    const colour = g.colour.hex ? `${g.colour.name} (${g.colour.hex})` : skipUnmeasured ? '' : g.colour.name;
    return [`${wearer(g.gender).who} ${colour}`.trim(), g.kind, g.details ? `(${g.details})` : ''].filter(Boolean).join(' ');
};

/** Identity first: the same garment, not a similar one; the family's own details after design and colour */
const buildGarmentPreservationPrompt = (g: GarmentBrief, family: Family) => {
    const colour = g.colour.hex ? `exactly ${g.colour.name} ${g.colour.hex}` : 'exactly the colour in image 0';
    return [
        `It is the same garment as in image 0, not a similar one: the same design and cut, the fabric ${colour}, the same fabric type and texture,`,
        `every embroidery, print, logo and pattern in its original place and size, the same stitching and seams, ${KEEP[family]}, and the same proportions.`,
        'The garment carries only the details visible in image 0; any part hidden in image 0 continues the visible fabric plainly.',
    ].join(' ');
};

/** Shared by all three styles: what a stylist does before the shot, without ironing away the design */
const buildPreparation = (family: Family) =>
    [
        family === 'bottom' ? 'The garment looks freshly steamed and neatly arranged: smooth fabric with only soft natural folds, the waistband straight, both legs untwisted, the hems level.'
        : family === 'saree' || family === 'lehenga' || family === 'dupatta' ? 'The fabric looks freshly steamed: smooth, with only the soft natural folds of the drape and pleats.'
        : 'The garment looks freshly steamed and neatly arranged: smooth fabric with only soft natural folds, level shoulders, the collar and neckline lying flat and even, sleeves straight and untwisted, the hem straight.',
        'Creases, crossed or folded parts and twisted fabric in image 0 come from how it was laid out, not from the design; pleats, gathers, ruching, distressing and crinkled textures are part of the design and stay.',
    ].join(' ');

/** How the garment takes shape in each style, by family */
const buildCategoryInstructions = (style: Exclude<PhotoStyle, 'ENHANCE'>, family: Family) => {
    if (style === 'GHOST') {
        if (family === 'bottom') return 'The trousers hold a rounded three-dimensional shape as if worn: the waistband open and round with the inner waistband visible, both legs straight and evenly filled out.';
        if (family === 'saree' || family === 'lehenga' || family === 'dupatta') return `${drapeHint(family)} The drape holds a rounded three-dimensional shape on its own, as if worn, with an empty, hollow interior.`;
        return 'The garment holds a rounded three-dimensional shape on its own, as if worn: full, even shoulders, the sleeves hanging naturally a little away from the sides, the front and back evenly filled out, and the plain inside of the back neckline visible through the front neck opening.';
    }
    const drape = drapeHint(family);
    if (family === 'bottom') return 'The waistband sits level at the waist and the legs fall straight to the hem.';
    if (style === 'MANNEQUIN') return drape || 'The shoulder seams sit on the shoulder line and the sleeves follow the arms; the garment hangs straight and centred.';
    return drape || 'The garment fits naturally at the correct size: shoulder seams on the shoulders, the fabric falling with real weight and soft natural folds.';
};

const STUDIO = 'True-to-life colour, sharp focus on the fabric texture, the whole garment in frame with a small margin. A clean catalogue photograph that shows the product clearly.';

/** The garment alone, shaped as if worn: the hollow ("ghost") look of large fashion stores */
const buildGhostPrompt = (g: GarmentBrief, family: Family) =>
    [
        `Hollow-form ("ghost") e-commerce product photo of the ${garmentLine(g, true)} from image 0, front view, centred; the garment is the only object in the picture.`,
        buildGarmentPreservationPrompt(g, family),
        buildCategoryInstructions('GHOST', family),
        buildPreparation(family),
        `Seamless pure white studio background (#FFFFFF), soft even light from the front and both sides, a soft shadow beneath the garment. ${STUDIO}`,
    ].join(' ');

/** The garment dressed on a plain, matching mannequin: an upper-body, full-body or lower-body form */
const buildMannequinPrompt = (g: GarmentBrief, family: Family) => {
    const shape = formShape(g.gender);
    const form =
        family === 'bottom' ? 'a headless lower-body mannequin, waist to ankles,'
        : FULL_LENGTH.includes(family) ? `a headless full-body ${shape} mannequin`.replace('  ', ' ')
        : `a headless ${shape} upper-body mannequin with shoulders and arms`.replace('  ', ' ');
    return [
        `E-commerce catalogue photo of the ${garmentLine(g, true)} from image 0, dressed on ${form} in smooth matte off-white (#F2F0EB) on a slim stand, front view, straight and centred.`,
        buildGarmentPreservationPrompt(g, family),
        buildCategoryInstructions('MANNEQUIN', family),
        buildPreparation(family),
        `Seamless light grey studio backdrop (#E9E9E9), soft even lighting, a soft natural shadow at the base. ${STUDIO}`,
    ].join(' ');
};

/**
 * MODEL poses. Each garment gets two or three poses that show it well; one is picked per photo
 * (see `variant`) so products do not all look alike. Every pose is a calm, natural fashion pose
 * with the garment front toward the camera, never a dramatic one. Parts are named only when the
 * garment is sure to have them (a chest pocket or buttons named here would be drawn onto shirts
 * that have none, as seen in testing), and a hand only goes into a pocket that surely exists:
 * the paired trousers' pocket for tops, the product's own pocket only for jeans and trousers.
 */
const WALK = 'A natural walking-inspired pose, mid-stride, the body turned slightly and the arms moving softly at the sides.';
const POSES = {
    formalShirt: [
        'The model stands straight but relaxed, the body turned about 20 degrees to one side with the chest and face toward the camera, one hand resting in the trouser pocket and the other arm relaxed at the side.',
        'The model stands upright and assured, the shoulders turned slightly and the weight on the back leg, one hand in the trouser pocket and the other hand relaxed by the side.',
    ],
    casualShirt: [
        'The model stands in a relaxed fashion stance, the weight on one leg and a slight shoulder turn, one hand in the trouser pocket and the other arm hanging loosely with a soft bend at the elbow.',
        'The model stands at a slight angle, both thumbs hooked lightly into the front trouser pockets, the shoulders relaxed.',
        WALK,
    ],
    tshirt: [
        'The model stands relaxed at a slight angle, the weight on one leg, one hand in the trouser pocket and the other arm loose at the side.',
        'The model stands relaxed with a subtle shoulder turn, both arms resting naturally a little away from the body.',
        WALK,
    ],
    knit: [
        'The model stands relaxed, the shoulders angled slightly, both arms hanging naturally a little away from the body.',
        'The model stands at a slight angle, the weight on one leg, one thumb hooked lightly into the trouser pocket and the other arm relaxed at the side.',
    ],
    pocketBottom: [
        'The model stands at a slight angle, the weight on one leg and one foot slightly forward, one thumb hooked lightly into the front pocket, the other arm relaxed at the side.',
        'A natural walking-inspired pose, one foot stepping forward, the body turned slightly, the arms relaxed at the sides.',
        'The model stands relaxed in a slight three-quarter turn, one hand resting in the front pocket, the other arm loose at the side.',
    ],
    plainBottom: [
        'The model stands at a slight angle with one foot slightly forward, one hand resting lightly at the side of the hip, the other arm relaxed.',
        'A natural walking-inspired pose, one foot stepping forward, the body turned slightly, the arms relaxed at the sides.',
    ],
    jacket: [
        'The model stands relaxed and confident, the body turned slightly, one hand in the trouser pocket and the other arm relaxed at the side.',
        'The model stands in a slight three-quarter turn, the weight on one leg, both arms relaxed at the sides.',
    ],
    kurta: [
        'An elegant, poised stance, the body turned slightly, one hand held loosely behind the back and the other arm relaxed at the side.',
        'A graceful standing pose, one foot slightly forward and the shoulders turned slightly, both arms relaxed at the sides.',
    ],
    saree: [
        'A graceful standing pose, the body turned slightly, one hand lightly holding the edge of the pallu at the waist, the other arm relaxed at the side.',
        'A graceful stance with one foot slightly forward, one hand resting softly at the side, the pallu falling freely from the shoulder.',
    ],
    lehenga: [
        'A graceful pose, the body turned slightly, one hand lightly holding the side of the skirt to show its flare, the other arm relaxed.',
        'A graceful stance, one foot slightly forward and the shoulders turned slightly, the arms relaxed, the skirt falling in its full flare.',
    ],
    dupatta: [
        'A graceful standing pose, the body turned slightly, one hand lightly holding the edge of the dupatta, the other arm relaxed.',
        'A graceful stance, one foot slightly forward, both arms relaxed, the dupatta falling freely.',
    ],
    dress: [
        'An elegant, natural stance, a slight body turn and the weight on one leg, one hand resting lightly on the hip and the other arm relaxed.',
        'A natural walking-inspired pose, one foot stepping forward, the arms moving softly, the skirt falling naturally.',
        'An elegant stance, one foot slightly forward and the shoulders turned slightly, both arms relaxed a little away from the body.',
    ],
};

/** What each pose must keep in view: only parts every garment of that kind has */
const SHOWCASE: Record<Family, string> = {
    shirt: 'the collar, the front and both sleeves',
    tshirt: 'the neckline, both sleeves and the overall fit',
    knit: 'the neckline, both cuffs and the fabric',
    bottom: 'the waistband and the full length of both legs',
    jacket: 'the front, the collar and the overall fit',
    kurta: 'the neckline, the sleeves and the full length',
    saree: 'the border, the pleats and the pallu',
    lehenga: 'the skirt flare and border, the blouse and the dupatta',
    dupatta: 'the border and the print',
    dress: 'the full silhouette, the waistline and the length',
    other: 'the whole garment',
};

/**
 * The pose for a MODEL photo: suited to the garment (formal or casual shirt, jeans or a skirt,
 * kurta, saree...), with `variant` choosing between the suitable poses.
 */
const getModelPoseInstructions = (g: GarmentBrief, family: Family, variant = 0) => {
    const text = [g.kind, g.category, g.details].filter(Boolean).join(' ').toLowerCase();
    const options =
        family === 'shirt' ? (/formal|office|business|oxford|dress shirt/.test(text) ? POSES.formalShirt : POSES.casualShirt)
        : family === 'bottom' ? (!/legging|jegging|palazzo|skirt/.test(text) && /jeans?\b|denim|trouser|chino|cargo|pant|shorts?\b/.test(text) ? POSES.pocketBottom : POSES.plainBottom)
        : family === 'other' ? POSES.tshirt
        : POSES[family];
    const kid = g.gender === 'BOYS' || g.gender === 'GIRLS' || g.gender === 'KIDS';
    return [
        options[Math.abs(variant) % options.length],
        family === 'jacket' ? 'The jacket is worn open or closed exactly as in image 0.' : '',
        `The pose keeps ${SHOWCASE[family]} in clear view, hands, arms and hair clear of the garment's details.`,
        kid
            ? 'A natural, cheerful expression, relaxed posture, natural proportions for the age, realistic hands.'
            : 'A natural, relaxed expression, confident posture, natural proportions, realistic hands, minimal jewellery.',
    ].filter(Boolean).join(' ');
};

/** A real-looking model of the right gender and age in a natural fashion pose that suits the garment */
const buildModelPrompt = (g: GarmentBrief, family: Family, variant = 0) => {
    const framing = TOPS.includes(family) ? 'framed from the head to just above the knees' : 'full length, head to feet';
    const pairing =
        family === 'bottom' ? ' with a plain white fitted t-shirt tucked in so the waistband stays visible, and simple shoes'
        : family === 'kurta' ? ' with plain matching straight pants and simple footwear'
        : family === 'saree' ? ' with a matching blouse and simple footwear'
        : family === 'dupatta' ? ' over a plain kurta in a neutral colour'
        : TOPS.includes(family) ? ' with plain charcoal trousers and simple shoes'
        : ' with simple footwear';
    return [
        `Premium fashion e-commerce photo of ${wearer(g.gender).model} wearing the ${garmentLine(g, true)} from image 0${pairing}, ${framing}, the front of the garment toward the camera.`,
        buildGarmentPreservationPrompt(g, family),
        buildCategoryInstructions('MODEL', family),
        getModelPoseInstructions(g, family, variant),
        buildPreparation(family),
        `Seamless very light grey studio backdrop (#F2F2F2), soft diffused studio lighting with gentle fill, natural skin tones, 85mm lens at f/8, the polished look of a premium clothing brand's e-commerce shoot. ${STUDIO}`,
    ].join(' ');
};

/**
 * Prompt for a catalogue photo of the shop's garment, in the chosen style.
 * The more exact the garment description (colour measured from the photo, who
 * it is for, its type and the shop's own notes), the less the AI invents.
 */
const professionalPrompt = (style: PhotoStyle, g: GarmentBrief, variant = 0) => {
    // The garment line goes first: the model may not read every word of a long prompt
    if (style === 'ENHANCE') return `The uploaded clothing photograph is image 0: a ${garmentLine(g)}.\n\n${ENHANCE_PROMPT}`;
    const family = familyOf([g.kind, g.category, g.details].filter(Boolean).join(' '), g.gender);
    return style === 'MODEL' ? buildModelPrompt(g, family, variant)
        : style === 'MANNEQUIN' ? buildMannequinPrompt(g, family)
        : buildGhostPrompt(g, family);
};

/** Size of an AI professional photo (4:5, as the store shows products; multiples of 16) */
const PRO_SIZE = {width: 832, height: 1040};

/** Built-in recolour, used when no Cloudflare AI keys are set */
export const LOCAL_MODEL = 'built-in-recolour';

class AiPreviewService {
    /** Cloudflare Workers AI when its keys are set, otherwise the built-in recolour */
    get aiReady() {
        return config.ai.accounts.length > 0;
    }

    get model() {
        return this.aiReady && config.ai.colourWithAi ? config.ai.imageModel : LOCAL_MODEL;
    }

    /** Only for callers that need the AI itself */
    public assertConfigured() {
        if (!this.aiReady) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                'AI preview is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN to the backend .env',
            );
        }
    }

    /**
     * One image from Workers AI, as base64. Each Cloudflare account in the .env is
     * tried in order; the next one takes over when an account is out of today's
     * free allowance or its token is rejected. A Cloudflare server error (5xx) is
     * tried once more on the same account, then on the next one.
     */
    private async run(prompt: string, image: Buffer, size = {width: OUTPUT_SIZE, height: OUTPUT_SIZE}, model = config.ai.imageModel): Promise<string> {
        const errors: Error[] = [];
        for (const [i, account] of config.ai.accounts.entries()) {
            for (let attempt = 1; ; attempt++) {
                try {
                    return await this.runOn(account, prompt, image, size, model);
                } catch (error) {
                    if (error instanceof ServerError && attempt < 2) {
                        logger.warn(`Workers AI account ${i + 1}: server error, trying again`);
                        await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS));
                        continue;
                    }
                    if (!(error instanceof QuotaError || error instanceof TokenError || error instanceof ServerError)) throw error;
                    errors.push(error);
                    if (i < config.ai.accounts.length - 1) {
                        logger.warn(`Workers AI account ${i + 1}: ${error.message} Trying account ${i + 2}.`);
                    }
                    break;
                }
            }
        }
        // Every account failed. "Try again" beats "used up" when an account still has allowance;
        // "used up" beats a bad token, so colour runs switch to the built-in recolour
        throw (
            errors.find((e) => e instanceof ServerError) ??
            errors.find((e) => e instanceof QuotaError) ??
            errors[0] ??
            new Error('AI preview is not configured')
        );
    }

    private async runOn(
        account: {id: string; token: string; tokenVar: string},
        prompt: string,
        image: Buffer,
        size: {width: number; height: number},
        model: string,
    ): Promise<string> {
        const form = new FormData();
        form.append('prompt', prompt);
        form.append(
            'input_image_0',
            new Blob([new Uint8Array(image)], {type: 'image/png'}),
            'source.png',
        );
        form.append('width', String(size.width));
        form.append('height', String(size.height));

        const url = `https://api.cloudflare.com/client/v4/accounts/${account.id.trim()}/ai/run/${model}`;
        let res: Response;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: {Authorization: `Bearer ${account.token.trim()}`},
                body: form,
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
        } catch (error) {
            const timeout = error instanceof Error && error.name === 'TimeoutError';
            throw new Error(
                timeout
                    ? 'The AI service took too long, try again'
                    : 'Could not reach the AI service',
            );
        }

        // Usually JSON {result: {image: base64}}; accept raw image bytes too
        const type = res.headers.get('content-type') ?? '';
        if (res.ok && type.startsWith('image/')) {
            return Buffer.from(await res.arrayBuffer()).toString('base64');
        }
        const body = (await res.json().catch(() => null)) as {
            result?: {image?: string};
            errors?: {message?: string}[];
        } | null;
        if (res.ok && body?.result?.image) return body.result.image;

        const message =
            body?.errors
                ?.map((e) => e.message)
                .filter(Boolean)
                .join('; ') || res.statusText;
        logger.warn(`Workers AI preview failed (${res.status}): ${message}`);
        if (res.status === 429 || /neuron|quota|limit/i.test(message)) {
            throw new QuotaError("Today's free AI allowance is used up. It resets at 5:30 AM (India time); try again after that.");
        }
        if (res.status === 401 || res.status === 403) {
            throw new TokenError(`The AI service rejected the API token; check ${account.tokenVar}`);
        }
        if (res.status >= 500) {
            throw new ServerError('The AI service had a temporary problem. Try again in a minute.');
        }
        throw new Error(`AI generation failed: ${message}`);
    }

    /**
     * One colour photo. The AI result (when keys are set) only supplies the
     * garment; the original background is always kept. Every result is checked
     * against the original before it may be saved; a failed AI result falls
     * back to the built-in recolour, a failed recolour is reported, not saved.
     */
    private async makeColour(
        photo: Photo,
        mask: Buffer,
        modelInput: Buffer | null,
        color: {name: string; hexCode: string},
        run: {aiOff: boolean},
    ) {
        if (modelInput && !run.aiOff) {
            try {
                const generated = await fromModelOutput(photo, await this.run(promptFor(color.name, color.hexCode), modelInput));
                const rgb = await compositeGarment(photo, mask, generated);
                const check = checkRecolour(photo, mask, rgb, color.hexCode);
                if (check.ok) return {ok: true as const, rgb, model: this.model};
                logger.warn(`AI colour photo rejected (${color.name}): ${check.reason} ${JSON.stringify(check)}`);
            } catch (error) {
                // Out of free AI for today: built-in recolour for the rest of this run
                if (error instanceof QuotaError) run.aiOff = true;
                logger.warn(`AI colour photo failed (${color.name}), using built-in recolour: ${String(error)}`);
            }
        }
        const rgb = recolourGarment(photo, mask, color.hexCode);
        const check = checkRecolour(photo, mask, rgb, color.hexCode);
        return check.ok
            ? {ok: true as const, rgb, model: LOCAL_MODEL}
            : {ok: false as const, reason: `Not saved: ${check.reason}`};
    }

    /**
     * Generate a preview of the product in each selected color, one after
     * another (free-tier rate limits). Failures are kept per color so the
     * shop can retry just those.
     */
    public async generate(
        req: Request,
        scope: ProductScope,
        productId: string,
        input: {colorIds: string[]; imageId?: string},
    ) {
        const product = await shopProductService.get(scope, productId);

        const source = input.imageId
            ? product.images.find((img) => img.id === input.imageId)
            : product.images[0];
        if (!source) {
            throw new ApiError(
                httpStatus.BAD_REQUEST,
                input.imageId ? 'Image not found' : 'Upload a product image first',
            );
        }
        const colors = input.colorIds.map((id) => product.colors.find((c) => c.id === id));
        if (colors.some((c) => !c)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Pick colors that are on this product', [
                {field: 'colorIds', message: 'Pick colors that are on this product'},
            ]);
        }

        // A clean white-background photo: work on the shop's original photo (the garment
        // is found far more reliably there) and put every colour on white the same way
        const original = source.cleanedFromId
            ? await prisma.productImage.findFirst({where: {id: source.cleanedFromId, productId}, select: {url: true}})
            : null;
        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(original?.url ?? source.url));
        } catch (error) {
            logger.warn(`Colour preview: cannot read image ${source.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }
        // Where the garment is: found once, used for every colour
        let mask: Buffer;
        try {
            mask = await segmentGarment(photo);
        } catch (error) {
            logger.warn(`Colour preview: garment detection failed: ${String(error)}`);
            throw new ApiError(httpStatus.UNPROCESSABLE_ENTITY, 'Could not find the garment in this photo. Use a photo of the garment on a plain background.');
        }
        // Colour photos use the built-in recolour (free, checked); the AI's small daily
        // allowance is kept for professional photos unless CLOUDFLARE_AI_FOR_COLOURS=true
        const modelInput = this.aiReady && config.ai.colourWithAi ? await toModelInput(photo) : null;
        const runState = {aiOff: false};

        let quotaMessage: string | null = null;
        let failed = 0;
        for (const color of colors as NonNullable<(typeof colors)[number]>[]) {
            const key = {productId, colorId: color.id, sourceImageId: source.id};
            const row = await prisma.productColorPreview.upsert({
                where: {productId_colorId_sourceImageId: key},
                create: {
                    ...key,
                    model: this.model,
                    status: PreviewStatus.PENDING,
                    createdById: req.user.id,
                },
                update: {
                    model: this.model,
                    status: PreviewStatus.PENDING,
                    error: null,
                    createdById: req.user.id,
                },
                select: {id: true, url: true},
            });

            if (quotaMessage) {
                failed++;
                await prisma.productColorPreview.update({
                    where: {id: row.id},
                    data: {status: PreviewStatus.FAILED, error: quotaMessage},
                });
                continue;
            }
            try {
                const made = await this.makeColour(photo, mask, modelInput, color, runState);
                if (!made.ok) throw new Error(made.reason);
                const jpeg = original
                    ? await studioPhoto(photo, mask, made.rgb)
                    : await toJpeg(photo, made.rgb);
                const url = await storeGenerated(req, jpeg.toString('base64'), 'previews');
                await prisma.$transaction([
                    prisma.productColorPreview.update({
                        where: {id: row.id},
                        data: {status: PreviewStatus.READY, url, error: null, model: made.model},
                    }),
                    // Every size of this colour shows this photo (store, bag, orders, POS),
                    // unless the shop set its own photo for that variant
                    prisma.productVariant.updateMany({
                        where: {
                            productId,
                            color: {equals: color.name, mode: 'insensitive'},
                            OR: [{image: null}, {image: ''}, ...(row.url ? [{image: row.url}] : [])],
                        },
                        data: {image: url},
                    }),
                ]);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'AI generation failed';
                if (error instanceof QuotaError) quotaMessage = message;
                failed++;
                await prisma.productColorPreview.update({
                    where: {id: row.id},
                    data: {status: PreviewStatus.FAILED, error: message.slice(0, 300)},
                });
            }
        }
        return {
            product: await shopProductService.get(scope, productId),
            failed,
            error: quotaMessage,
        };
    }

    public async remove(scope: ProductScope, productId: string, previewId: string) {
        const product = await shopProductService.get(scope, productId);
        const preview = product.previews.find((p) => p.id === previewId);
        if (!preview) throw new ApiError(httpStatus.NOT_FOUND, 'Preview not found');
        await prisma.$transaction([
            prisma.productColorPreview.delete({where: {id: previewId}}),
            // Variants that showed this photo go back to the product's own photos
            ...(preview.url
                ? [prisma.productVariant.updateMany({where: {productId, image: preview.url}, data: {image: null}})]
                : []),
        ]);
        return {before: preview, after: await shopProductService.get(scope, productId)};
    }

    /**
     * Turn a shop photo (taken on a bed, floor or mat) into a catalogue photo:
     * the garment on a plain white background. Added as a new photo and made the
     * main one; the original stays, and colour photos are made from it.
     */
    public async cleanBackground(req: Request, scope: ProductScope, productId: string, imageId: string) {
        const product = await shopProductService.get(scope, productId);
        const source = product.images.find((img) => img.id === imageId);
        if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        if (source.cleanedFromId) throw new ApiError(httpStatus.BAD_REQUEST, 'This photo already has a clean background');
        if (source.aiStyle) throw new ApiError(httpStatus.BAD_REQUEST, 'This photo was made by the AI on a white background already');
        const existing = product.images.find((img) => img.cleanedFromId === source.id);
        if (existing) throw new ApiError(httpStatus.BAD_REQUEST, 'A clean photo of this image is already there');
        if (product.images.length >= 8) throw new ApiError(httpStatus.BAD_REQUEST, 'A product can have at most 8 images; delete one first');

        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(source.url));
        } catch (error) {
            logger.warn(`Clean background: cannot read image ${source.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }
        let jpeg: Buffer;
        try {
            jpeg = await studioPhoto(photo, await segmentGarment(photo));
        } catch (error) {
            logger.warn(`Clean background failed: ${String(error)}`);
            throw new ApiError(
                httpStatus.UNPROCESSABLE_ENTITY,
                'Could not find the garment in this photo. Take the photo from above with the whole garment in view.',
            );
        }
        const url = await storeGenerated(req, jpeg.toString('base64'), 'products');
        await prisma.$transaction([
            prisma.productImage.updateMany({where: {productId}, data: {isMain: false}}),
            prisma.productImage.create({
                data: {productId, url, altText: product.name, order: source.order, isMain: true, isAiGenerated: true, cleanedFromId: source.id},
            }),
        ]);
        return shopProductService.get(scope, productId);
    }

    /**
     * A professional catalogue photo made by the AI from a shop photo: the garment
     * on an invisible 3D mannequin, on a dress-form mannequin, or worn by a model.
     * Added as a new photo and made the main one; the shop photo stays. Colour
     * photos can then be made from it like from any photo.
     */
    public async professionalPhoto(req: Request, scope: ProductScope, productId: string, imageId: string, style: PhotoStyle, details?: string) {
        if (!this.aiReady) {
            throw new ApiError(
                httpStatus.SERVICE_UNAVAILABLE,
                'Professional photos need the Cloudflare AI keys. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN to backend/.env (steps in backend/docs/colour-photos-setup.md) and restart the backend.',
            );
        }
        const product = await shopProductService.get(scope, productId);
        const source = product.images.find((img) => img.id === imageId);
        if (!source) throw new ApiError(httpStatus.NOT_FOUND, 'Image not found');
        if (product.images.length >= 8) throw new ApiError(httpStatus.BAD_REQUEST, 'A product can have at most 8 images; delete one first');

        // The AI works best from the clean cut-out when there is one
        const original = source.cleanedFromId ? source : product.images.find((img) => img.cleanedFromId === source.id) ?? source;
        let photo: Photo;
        try {
            photo = await loadPhoto(await readStoredImage(original.url));
        } catch (error) {
            logger.warn(`Professional photo: cannot read image ${original.url}: ${String(error)}`);
            throw new ApiError(httpStatus.BAD_REQUEST, 'Could not read the product image');
        }
        // Colour measured from the garment itself (the mask is cached, so this is quick after Clean background)
        let colour = {name: 'same colour as the photo', hex: ''};
        try {
            colour = garmentColour(photo, await segmentGarment(photo));
        } catch (error) {
            logger.warn(`Professional photo: could not measure the colour: ${String(error)}`);
        }
        const brief: GarmentBrief = {
            gender: product.gender,
            kind: [product.name, product.subcategory?.name].filter(Boolean).join(', '),
            colour,
            details: details?.trim() || undefined,
            category: [product.category?.name, product.productType].filter(Boolean).join(', ') || undefined,
        };
        // MODEL pose: differs between products, and moves on to the next pose with each new model photo of one product
        const variant = [...productId].reduce((t, c) => t + c.charCodeAt(0), 0) + product.images.filter((img) => img.aiStyle === 'MODEL').length;
        let base64: string;
        try {
            base64 = await this.run(professionalPrompt(style, brief, variant), await toModelInput(photo), PRO_SIZE, config.ai.proModel);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'AI generation failed';
            throw new ApiError(error instanceof QuotaError ? httpStatus.TOO_MANY_REQUESTS : httpStatus.BAD_GATEWAY, message);
        }
        // Never save an empty or broken result
        const out = sharp(Buffer.from(base64, 'base64'));
        const stats = await out.stats().catch(() => null);
        const spread = stats ? stats.channels.slice(0, 3).reduce((t, c) => t + c.stdev, 0) / 3 : 0;
        if (spread < 8) throw new ApiError(httpStatus.BAD_GATEWAY, 'The AI returned an empty picture; try again');
        const jpeg = await out.flatten({background: '#ffffff'}).jpeg({quality: 90, mozjpeg: true}).toBuffer();

        const url = await storeGenerated(req, jpeg.toString('base64'), 'products');
        await prisma.$transaction([
            prisma.productImage.updateMany({where: {productId}, data: {isMain: false}}),
            prisma.productImage.create({
                data: {productId, url, altText: product.name, order: source.order, isMain: true, isAiGenerated: true, aiStyle: style},
            }),
        ]);
        return shopProductService.get(scope, productId);
    }
}

export default new AiPreviewService();
