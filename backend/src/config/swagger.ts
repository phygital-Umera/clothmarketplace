import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import {Request, Response, Router} from 'express';

const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'My Express API',
            version: '1.0.0',
            description: 'API documentation for my Express application',
        },
    },
    apis: ['./src/routes/*.ts'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

const swaggerRouter = Router();

swaggerRouter.use('/api-docs', swaggerUi.serve);
swaggerRouter.get('/api-docs', (req: Request, res: Response) => {
    res.send(swaggerUi.generateHTML(swaggerDocs));
});

export default swaggerRouter;
