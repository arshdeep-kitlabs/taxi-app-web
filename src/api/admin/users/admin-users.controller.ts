import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { adminId } from '../../../common/http/require-admin.js';
import { validate } from '../../../common/http/validate.js';
import type { AdminAuthService } from '../../../modules/admin-auth/admin-auth.service.js';
import { AdminUpdateDto } from '../auth/admin-auth.dto.js';

export class AdminUsersController {
  constructor(private readonly service: AdminAuthService) {}

  /** GET /admin/users — every staff account, pending ones first. */
  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(success({ rows: await this.service.list() }));
  };

  /** PATCH /admin/users/:adminId — approve, suspend, reject, or change role. */
  update = async (req: Request, res: Response): Promise<void> => {
    const changes = validate(AdminUpdateDto, req.body);
    const target = String(req.params.adminId);
    res.json(success(await this.service.update(adminId(res), target, changes)));
  };
}
