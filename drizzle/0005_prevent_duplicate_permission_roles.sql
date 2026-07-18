WITH duplicate_roles AS (
	SELECT
		"id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "organization_id", "system_key"
			ORDER BY "created_at", "id"
		) AS "keeper_id"
	FROM "permission_roles"
	WHERE "system_key" IS NOT NULL
)
UPDATE "member_role_assignments" AS "assignment"
SET "role_id" = "duplicate_roles"."keeper_id"
FROM "duplicate_roles"
WHERE "assignment"."role_id" = "duplicate_roles"."id"
	AND "duplicate_roles"."id" <> "duplicate_roles"."keeper_id";
--> statement-breakpoint
WITH duplicate_roles AS (
	SELECT
		"id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "organization_id", "system_key"
			ORDER BY "created_at", "id"
		) AS "keeper_id"
	FROM "permission_roles"
	WHERE "system_key" IS NOT NULL
)
UPDATE "permission_role_permissions" AS "role_permission"
SET "role_id" = "duplicate_roles"."keeper_id"
FROM "duplicate_roles"
WHERE "role_permission"."role_id" = "duplicate_roles"."id"
	AND "duplicate_roles"."id" <> "duplicate_roles"."keeper_id";
--> statement-breakpoint
DELETE FROM "member_role_assignments" AS "duplicate"
USING "member_role_assignments" AS "keeper"
WHERE "duplicate"."id" > "keeper"."id"
	AND "duplicate"."organization_id" = "keeper"."organization_id"
	AND "duplicate"."member_id" = "keeper"."member_id"
	AND "duplicate"."role_id" = "keeper"."role_id"
	AND "duplicate"."team_id" IS NOT DISTINCT FROM "keeper"."team_id";
--> statement-breakpoint
DELETE FROM "permission_role_permissions" AS "duplicate"
USING "permission_role_permissions" AS "keeper"
WHERE "duplicate"."id" > "keeper"."id"
	AND "duplicate"."role_id" = "keeper"."role_id"
	AND "duplicate"."permission" = "keeper"."permission";
--> statement-breakpoint
WITH duplicate_roles AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "organization_id", "system_key"
			ORDER BY "created_at", "id"
		) AS "position"
	FROM "permission_roles"
	WHERE "system_key" IS NOT NULL
)
DELETE FROM "permission_roles"
USING "duplicate_roles"
WHERE "permission_roles"."id" = "duplicate_roles"."id"
	AND "duplicate_roles"."position" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "permission_role_permissions_role_permission_unique" ON "permission_role_permissions" USING btree ("role_id","permission");
--> statement-breakpoint
CREATE UNIQUE INDEX "permission_roles_organization_system_key_unique" ON "permission_roles" USING btree ("organization_id","system_key") WHERE "permission_roles"."system_key" is not null;
