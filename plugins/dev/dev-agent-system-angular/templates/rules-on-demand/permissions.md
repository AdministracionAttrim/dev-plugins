# Permissions Rule

## i:

3-layer RBAC: L1 route guard | L2 useFeaturePermissions | L3 template bindings. Apply all three.
detail: @file:docs/wiki/patterns/permissions.md

## T→A:

T: new route → A: canActivate:[hasPermissionGuard] + canDeactivate:[PendingChangesGuard] (create/edit) | activeEntityResolver(Service, {redirectIfInactive:true}) (edit/detail)
T: component needs perms → A: useFeaturePermissions(PERMS) | !inject(PermissionService)
T: extra/custom perm → A: `PERMS = {...BASE, EXTRA:'CODE'} satisfies FeaturePermissions<"EXTRA">` | permissions.has(PERMS.EXTRA)()
T: edit component con custom perm → A: load @rule:permissions FIRST | !!permissions.EXTRA() (no existe en FeaturePermissionState) | siempre permissions.has(PERMS.EXTRA)()
T: <app-\*> component hide → A: [hidden]="!canXxx()" with computed | !![appHasPermission] (compile error)
T: native HTML el → A: [appHasPermission]="CODE"
T: perm + business workflow → A: computed(() => permissions.canX() && workflowService.canY())

## G:[IDs]

G:001 !!inject(PermissionService); always useFeaturePermissions
G:002 !![appHasPermission] on <app-\*> (compile error — directive on custom element)
G:003 PERMS values == string codes; !UUIDs (LE-SS-0012)
G:004 base: 5 keys LIST,DETAIL,CREATE,UPDATE,DELETE | extra: `satisfies FeaturePermissions<"EXTRA_KEY">`
G:005 no role perm → hide | temp unavailable → disable; !!disabled to mean "no permission"

## @refs

@file:docs/wiki/patterns/permissions.md
