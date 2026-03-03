import type { FastifyInstance } from 'fastify';
import * as menuService from './menu.service.js';
import {
  extractMenuFromImage,
  extractMenuFromText,
  extractMenuFromUrl,
  saveImportedMenu,
} from '../../services/menu-import.service.js';
import {
  createCategoryBodySchema,
  updateCategoryBodySchema,
  reorderBodySchema,
  createMenuItemBodySchema,
  updateMenuItemBodySchema,
  dailyMenuBodySchema,
} from './menu.schema.js';
import { success, error } from '../../utils/helpers.js';
import { AppError } from '../../utils/errors.js';
import { z } from 'zod';

export default async function menuRoutes(app: FastifyInstance) {
  // Public routes (no auth)
  app.get('/api/public/:slug/menu', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const data = await menuService.getPublicMenu(slug);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  app.get('/api/public/:slug/info', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const data = await menuService.getPublicInfo(slug);
      return reply.send(success(data));
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
      throw err;
    }
  });

  // Authenticated routes
  app.register(async (authApp) => {
    authApp.addHook('preHandler', app.requireTenant);

    authApp.get('/api/menu/categories', async (request, reply) => {
      try {
        const data = await menuService.listCategories(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/menu/categories', async (request, reply) => {
      try {
        const body = createCategoryBodySchema.parse(request.body);
        const data = await menuService.createCategory(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/menu/categories/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateCategoryBodySchema.parse(request.body);
        const data = await menuService.updateCategory(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.delete('/api/menu/categories/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await menuService.deleteCategory(request.tenantId, id);
        return reply.send(success({ message: 'Categoria excluída' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/menu/categories/reorder', async (request, reply) => {
      try {
        const body = reorderBodySchema.parse(request.body);
        await menuService.reorderCategories(request.tenantId, body);
        return reply.send(success({ message: 'Ordem atualizada' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.get('/api/menu/items', async (request, reply) => {
      try {
        const data = await menuService.listItems(request.tenantId);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/menu/items', async (request, reply) => {
      try {
        const body = createMenuItemBodySchema.parse(request.body);
        const data = await menuService.createItem(request.tenantId, body);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/menu/items/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = updateMenuItemBodySchema.parse(request.body);
        const data = await menuService.updateItem(request.tenantId, id, body);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.delete('/api/menu/items/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await menuService.deleteItem(request.tenantId, id);
        return reply.send(success({ message: 'Item excluído' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/menu/items/:id/toggle', async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const data = await menuService.toggleItem(request.tenantId, id);
        return reply.send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.put('/api/menu/items/reorder', async (request, reply) => {
      try {
        const body = reorderBodySchema.parse(request.body);
        await menuService.reorderItems(request.tenantId, body);
        return reply.send(success({ message: 'Ordem atualizada' }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/menu/daily', async (request, reply) => {
      try {
        const body = dailyMenuBodySchema.parse(request.body);
        const data = await menuService.createDailyMenu(request.tenantId, body.rawInput);
        return reply.status(201).send(success(data));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    // ─── Menu Import via AI ───────────────────────────────────────────

    authApp.post('/api/menu/import/image', async (request, reply) => {
      try {
        const parts = request.parts();
        const imagePaths: string[] = [];
        let replaceExisting = false;
        let mergeCategories = false;

        for await (const part of parts) {
          if (part.type === 'file') {
            const { writeFile } = await import('node:fs/promises');
            const { join } = await import('node:path');
            const { randomUUID } = await import('node:crypto');
            const ext = part.filename.split('.').pop() || 'jpg';
            const fileName = `import-${randomUUID()}.${ext}`;
            const uploadDir = join(process.cwd(), 'uploads', 'imports');
            const { mkdir } = await import('node:fs/promises');
            await mkdir(uploadDir, { recursive: true });
            const filePath = join(uploadDir, fileName);
            const buffer = await part.toBuffer();
            await writeFile(filePath, buffer);
            imagePaths.push(filePath);
          } else if (part.type === 'field') {
            if (part.fieldname === 'replaceExisting') replaceExisting = part.value === 'true';
            if (part.fieldname === 'mergeCategories') mergeCategories = part.value === 'true';
          }
        }

        if (imagePaths.length === 0) {
          return reply.status(400).send(error('Nenhuma imagem enviada'));
        }

        const categories = await extractMenuFromImage(request.tenantId, imagePaths);
        const result = await saveImportedMenu(request.tenantId, categories, {
          replaceExisting,
          mergeCategories,
        });

        return reply.send(success(result));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/menu/import/text', async (request, reply) => {
      try {
        const schema = z.object({
          text: z.string().min(10, 'Texto muito curto'),
          replaceExisting: z.boolean().default(false),
          mergeCategories: z.boolean().default(true),
        });
        const body = schema.parse(request.body);

        const categories = await extractMenuFromText(request.tenantId, body.text);
        const result = await saveImportedMenu(request.tenantId, categories, {
          replaceExisting: body.replaceExisting,
          mergeCategories: body.mergeCategories,
        });

        return reply.send(success(result));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/menu/import/url', async (request, reply) => {
      try {
        const schema = z.object({
          imageUrl: z.string().url(),
          replaceExisting: z.boolean().default(false),
          mergeCategories: z.boolean().default(true),
        });
        const body = schema.parse(request.body);

        const categories = await extractMenuFromUrl(request.tenantId, body.imageUrl);
        const result = await saveImportedMenu(request.tenantId, categories, {
          replaceExisting: body.replaceExisting,
          mergeCategories: body.mergeCategories,
        });

        return reply.send(success(result));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });

    authApp.post('/api/menu/import/preview', async (request, reply) => {
      try {
        const schema = z.object({
          text: z.string().optional(),
          imageUrl: z.string().url().optional(),
        });
        const body = schema.parse(request.body);

        let categories;
        if (body.imageUrl) {
          categories = await extractMenuFromUrl(request.tenantId, body.imageUrl);
        } else if (body.text) {
          categories = await extractMenuFromText(request.tenantId, body.text);
        } else {
          return reply.status(400).send(error('Envie text ou imageUrl'));
        }

        const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
        return reply.send(success({
          categories,
          totalCategories: categories.length,
          totalItems,
        }));
      } catch (err) {
        if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message));
        throw err;
      }
    });
  });
}
