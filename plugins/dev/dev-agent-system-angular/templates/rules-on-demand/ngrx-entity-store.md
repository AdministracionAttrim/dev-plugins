# NgRx Entity Store Rule

## i:

Every entity feature uses signalStore + withCrudOperations + withTableCustomConfig. !classic @ngrx/store.

## Store Definition

`signalStore({ providedIn:"root" }, withCrudOperations<Entity, EntitySearch>(Service, { filteredDataPathSuffix, statusToggle, entityStatus }), withTableCustomConfig(TABLE_ID))`
detail: @file:docs/wiki/patterns/ngrx-store-api-reference.md

## T→A:

T: default dateNull/dateNotNull insufficient → A: statusToggle.getFilters(isActive) returning filter | filter[]
T: boolean active field → A: getFilters: (isActive) => ({field:'active', operator:'equals', value:isActive})
T: multiple date fields toggle → A: getFilters returning array of {dateNull | dateNotNull}

## G:[IDs]

G:001 !!createAction | createReducer | createEffect (classic NgRx forbidden)
G:002 !!new HttpClient() in component
G:003 !!signal(false) for loading; use store.isPending()

## @refs

@file:docs/wiki/patterns/ngrx-store-api-reference.md (full API: signals, methods, statusToggle patterns)

