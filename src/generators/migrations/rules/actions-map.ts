import { RelationshipOptions } from "../definitions/column-definition.types";

/**
 * The exact Prisma referential actions as strings in DMMF.Field
 */
type PrismaReferentialAction =
   | 'Cascade'
   | 'Restrict'
   | 'NoAction'
   | 'SetNull'
   | 'SetDefault';

/**
 * Map Prisma’s actions to the Laravel strings you defined in RelationshipOptions.
 */
const prismaToLaravelAction: Record<
   PrismaReferentialAction,
   Exclude<RelationshipOptions['onDelete'], undefined>
> = {
   Cascade: 'cascade',
   Restrict: 'restrict',
   NoAction: 'no action',
   SetNull: 'set null',
   SetDefault: 'set default',
};

