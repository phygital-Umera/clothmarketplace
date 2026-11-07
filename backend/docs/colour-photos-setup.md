# Colour photos: how they work and how to turn on Cloudflare AI

When a shop adds a product and selects colours, the panel can make a photo of
the garment in each colour (Add Product → "Make a photo in each selected
colour", or the **Generate Preview** button on the product page).

## How it works (no setup needed)

1. **Find the garment.** A segmentation model on the server cuts the garment
   out of the photo (collar, body, sleeves, cuffs). It runs locally: no key,
   no internet, no cost. About 8–15 seconds per photo.
2. **Recolour only the garment.** The main fabric takes the new colour and
   keeps its folds, seams, stitching, buttons and texture. Labels, embroidery
   and contrast trims stay as they are. The background is not touched.
3. **Check before saving.** Every result is compared with the original:
   - background must be unchanged,
   - the garment must really be the chosen colour,
   - the garment must keep its original light and shade (an image with
     stripes or a new pattern is rejected).
   A result that fails is **not saved**; the panel shows "Not saved: …".

Without Cloudflare keys this built-in recolour is used. The panel labels these
photos **Recoloured**. It works best for one-colour garments photographed on a
plain background.

## Clean background (no setup needed)

On the product page, **Clean background** turns a photo taken on a bed, floor
or mat into a catalogue photo: the garment is cut out and placed in the middle
of a plain white background with a soft shadow. The garment itself is not
changed. Colour photos made from the clean photo also come out on white.

## Professional photo with a mannequin or model (needs Cloudflare AI)

On the product page, **Professional photo (AI)** makes a studio photo from the
shop's photo, in one of three styles:

| Style | What you get |
|---|---|
| 3D, no mannequin | The garment with body shape, nothing else (the "ghost mannequin" look of big shopping sites) |
| On a mannequin | The garment on a white dress-form mannequin |
| Worn by a model | A model wearing it; sarees, lehengas and dupattas are draped properly |

The new photo becomes the main photo; the shop's photo is kept. Colour photos
can be made from it. Because the AI draws a new picture, check small details
(prints, borders, labels) before publishing.

**Get the best result:** use a photo of the whole garment, and type a few words
in **Garment details** (e.g. "turtleneck, rib knit, no zip" or "silk saree with
gold zari border"). The colour is measured from the photo and men's / women's /
kids' comes from the product, so set the product's gender and name correctly.

**Daily limit:** the free Cloudflare plan allows 10,000 "neurons" a day, which
is roughly **10–15 professional photos a day**. It resets at 00:00 UTC
(5:30 AM India time). For more, upgrade to Cloudflare's Workers Paid plan
(US$5/month, then a small charge per photo). Colour photos use the built-in
recolour, so they do not use this allowance.

This needs the keys below.

## Turning on Cloudflare AI (needed for professional photos; also better colour photos on textured fabrics)

With keys set, professional photos use Cloudflare Workers AI (FLUX.2 klein 9B).
Colour photos keep using the built-in recolour so they do not use up the daily
allowance. To use the AI for colour photos as well, add
`CLOUDFLARE_AI_FOR_COLOURS=true` to `backend/.env` (its result is still checked,
and the built-in recolour is used when the check fails or the allowance runs
out); these photos are labelled **AI preview**.

### Step 1 — Create a free Cloudflare account

1. Open <https://dash.cloudflare.com/sign-up>.
2. Sign up with your email and a password, then open the verification email
   and click the link.
3. You do **not** need to add a website or a payment method.

### Step 2 — Copy your Account ID

1. Sign in at <https://dash.cloudflare.com>.
2. In the left menu open **Workers & Pages** (or **AI → Workers AI**).
3. On the right side of that page, find **Account ID** and click **Copy**.
   (It is a 32-character code. It also appears in the browser address:
   `dash.cloudflare.com/<account-id>/…`.)

### Step 3 — Create an API token for Workers AI

1. Click your profile icon (top right) → **My Profile** → **API Tokens**.
2. Click **Create Token**.
3. Next to the **Workers AI** template, click **Use template**.
   (If there is no template: choose **Create Custom Token**, give it a name,
   and under Permissions pick **Account → Workers AI → Read** and
   **Account → Workers AI → Edit**.)
4. Under **Account Resources**, choose your account.
5. Click **Continue to summary** → **Create Token**.
6. **Copy the token now.** Cloudflare shows it only once.

### Step 4 — Check the token works (optional)

In a terminal (replace `YOUR_TOKEN`):

```
curl https://api.cloudflare.com/client/v4/user/tokens/verify -H "Authorization: Bearer YOUR_TOKEN"
```

You should see `"This API Token is valid and active"`.

### Step 5 — Add the keys to the backend

Open `backend/.env` and add these lines (your own values, no quotes):

```
CLOUDFLARE_ACCOUNT_ID=your-32-character-account-id
CLOUDFLARE_AI_API_TOKEN=your-api-token
```

Optional: `CLOUDFLARE_AI_PRO_MODEL` (default `@cf/black-forest-labs/flux-2-klein-9b`,
best in our tests) and `CLOUDFLARE_AI_MODEL` for colour photos (default
`@cf/black-forest-labs/flux-2-klein-4b`).

Keep `.env` private: never commit it or send the token to anyone.

### Step 6 — Restart the backend and try it

1. Stop the backend (Ctrl + C) and start it again (`npm run dev`).
2. In the panel open a product → **AI Color Preview** → tick colours →
   **Generate Preview**. New photos are labelled **AI preview**.
3. To redo an old colour photo, select that colour and generate again; the old
   one is replaced.

## Limits and troubleshooting

| What you see | What to do |
|---|---|
| Photos labelled "Recoloured" after adding keys | The backend was not restarted, or the keys have a typo. Restart and check Step 4. |
| "The AI service rejected the API token" in the server log | The token lacks Workers AI permission. Create it again (Step 3). |
| "Today's free AI allowance is used up" | The free plan allows roughly 10–15 professional photos a day. Wait until 5:30 AM India time, or upgrade to Workers Paid. |
| "Not saved: The garment is not in the chosen colour" | The photo has several colours or a busy background. Use a photo of one garment on a plain background. |
| "Could not find the garment in this photo" | Use a clearer photo: the whole garment, plain background, good light. |

Best photos: one garment, front view, plain white or light background, even
light, no people or other items in the frame.
