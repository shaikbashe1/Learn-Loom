import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Plan } from '@prisma/client';
import { PLANS_KEY } from '../decorators/plans.decorator';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlans = this.reflector.getAllAndOverride<Plan[]>(PLANS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPlans || requiredPlans.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    const hasPlan = requiredPlans.includes(user.plan);
    if (!hasPlan) {
      throw new ForbiddenException(`Upgrade to a higher subscription tier (${requiredPlans.join(' / ')}) to access this resource.`);
    }
    return true;
  }
}
