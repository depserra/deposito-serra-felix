import { z } from 'zod';
import { clienteSchema } from './schemas';

export type ClienteFormData = z.infer<typeof clienteSchema>;