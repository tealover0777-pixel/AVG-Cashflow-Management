# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllMovies*](#listallmovies)
  - [*GetUserWatchHistory*](#getuserwatchhistory)
- [**Mutations**](#mutations)
  - [*CreateNewMovieList*](#createnewmovielist)
  - [*AddMovieToMovieList*](#addmovietomovielist)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllMovies
You can execute the `ListAllMovies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllMovies(): QueryPromise<ListAllMoviesData, undefined>;

interface ListAllMoviesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMoviesData, undefined>;
}
export const listAllMoviesRef: ListAllMoviesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllMovies(dc: DataConnect): QueryPromise<ListAllMoviesData, undefined>;

interface ListAllMoviesRef {
  ...
  (dc: DataConnect): QueryRef<ListAllMoviesData, undefined>;
}
export const listAllMoviesRef: ListAllMoviesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllMoviesRef:
```typescript
const name = listAllMoviesRef.operationName;
console.log(name);
```

### Variables
The `ListAllMovies` query has no variables.
### Return Type
Recall that executing the `ListAllMovies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllMoviesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllMoviesData {
  movies: ({
    id: UUIDString;
    title: string;
    year: number;
    director?: string | null;
    genres?: string[] | null;
    posterUrl?: string | null;
    runtimeMinutes?: number | null;
    summary?: string | null;
  } & Movie_Key)[];
}
```
### Using `ListAllMovies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllMovies } from '@dataconnect/generated';


// Call the `listAllMovies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllMovies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllMovies(dataConnect);

console.log(data.movies);

// Or, you can use the `Promise` API.
listAllMovies().then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

### Using `ListAllMovies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllMoviesRef } from '@dataconnect/generated';


// Call the `listAllMoviesRef()` function to get a reference to the query.
const ref = listAllMoviesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllMoviesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

## GetUserWatchHistory
You can execute the `GetUserWatchHistory` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserWatchHistory(vars: GetUserWatchHistoryVariables): QueryPromise<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;

interface GetUserWatchHistoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserWatchHistoryVariables): QueryRef<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;
}
export const getUserWatchHistoryRef: GetUserWatchHistoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserWatchHistory(dc: DataConnect, vars: GetUserWatchHistoryVariables): QueryPromise<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;

interface GetUserWatchHistoryRef {
  ...
  (dc: DataConnect, vars: GetUserWatchHistoryVariables): QueryRef<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;
}
export const getUserWatchHistoryRef: GetUserWatchHistoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserWatchHistoryRef:
```typescript
const name = getUserWatchHistoryRef.operationName;
console.log(name);
```

### Variables
The `GetUserWatchHistory` query requires an argument of type `GetUserWatchHistoryVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserWatchHistoryVariables {
  userId: UUIDString;
}
```
### Return Type
Recall that executing the `GetUserWatchHistory` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserWatchHistoryData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetUserWatchHistoryData {
  watches: ({
    id: UUIDString;
    watchDate: DateString;
    location?: string | null;
    notes?: string | null;
    movie: {
      title: string;
      year: number;
    };
  } & Watch_Key)[];
}
```
### Using `GetUserWatchHistory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserWatchHistory, GetUserWatchHistoryVariables } from '@dataconnect/generated';

// The `GetUserWatchHistory` query requires an argument of type `GetUserWatchHistoryVariables`:
const getUserWatchHistoryVars: GetUserWatchHistoryVariables = {
  userId: ..., 
};

// Call the `getUserWatchHistory()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserWatchHistory(getUserWatchHistoryVars);
// Variables can be defined inline as well.
const { data } = await getUserWatchHistory({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserWatchHistory(dataConnect, getUserWatchHistoryVars);

console.log(data.watches);

// Or, you can use the `Promise` API.
getUserWatchHistory(getUserWatchHistoryVars).then((response) => {
  const data = response.data;
  console.log(data.watches);
});
```

### Using `GetUserWatchHistory`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserWatchHistoryRef, GetUserWatchHistoryVariables } from '@dataconnect/generated';

// The `GetUserWatchHistory` query requires an argument of type `GetUserWatchHistoryVariables`:
const getUserWatchHistoryVars: GetUserWatchHistoryVariables = {
  userId: ..., 
};

// Call the `getUserWatchHistoryRef()` function to get a reference to the query.
const ref = getUserWatchHistoryRef(getUserWatchHistoryVars);
// Variables can be defined inline as well.
const ref = getUserWatchHistoryRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserWatchHistoryRef(dataConnect, getUserWatchHistoryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.watches);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.watches);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateNewMovieList
You can execute the `CreateNewMovieList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createNewMovieList(vars: CreateNewMovieListVariables): MutationPromise<CreateNewMovieListData, CreateNewMovieListVariables>;

interface CreateNewMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewMovieListVariables): MutationRef<CreateNewMovieListData, CreateNewMovieListVariables>;
}
export const createNewMovieListRef: CreateNewMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createNewMovieList(dc: DataConnect, vars: CreateNewMovieListVariables): MutationPromise<CreateNewMovieListData, CreateNewMovieListVariables>;

interface CreateNewMovieListRef {
  ...
  (dc: DataConnect, vars: CreateNewMovieListVariables): MutationRef<CreateNewMovieListData, CreateNewMovieListVariables>;
}
export const createNewMovieListRef: CreateNewMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createNewMovieListRef:
```typescript
const name = createNewMovieListRef.operationName;
console.log(name);
```

### Variables
The `CreateNewMovieList` mutation requires an argument of type `CreateNewMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateNewMovieListVariables {
  name: string;
  description?: string | null;
  isPublic: boolean;
  privateShareLink?: string | null;
}
```
### Return Type
Recall that executing the `CreateNewMovieList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateNewMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateNewMovieListData {
  movieList_insert: MovieList_Key;
}
```
### Using `CreateNewMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createNewMovieList, CreateNewMovieListVariables } from '@dataconnect/generated';

// The `CreateNewMovieList` mutation requires an argument of type `CreateNewMovieListVariables`:
const createNewMovieListVars: CreateNewMovieListVariables = {
  name: ..., 
  description: ..., // optional
  isPublic: ..., 
  privateShareLink: ..., // optional
};

// Call the `createNewMovieList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createNewMovieList(createNewMovieListVars);
// Variables can be defined inline as well.
const { data } = await createNewMovieList({ name: ..., description: ..., isPublic: ..., privateShareLink: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createNewMovieList(dataConnect, createNewMovieListVars);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
createNewMovieList(createNewMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

### Using `CreateNewMovieList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createNewMovieListRef, CreateNewMovieListVariables } from '@dataconnect/generated';

// The `CreateNewMovieList` mutation requires an argument of type `CreateNewMovieListVariables`:
const createNewMovieListVars: CreateNewMovieListVariables = {
  name: ..., 
  description: ..., // optional
  isPublic: ..., 
  privateShareLink: ..., // optional
};

// Call the `createNewMovieListRef()` function to get a reference to the mutation.
const ref = createNewMovieListRef(createNewMovieListVars);
// Variables can be defined inline as well.
const ref = createNewMovieListRef({ name: ..., description: ..., isPublic: ..., privateShareLink: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createNewMovieListRef(dataConnect, createNewMovieListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieList_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieList_insert);
});
```

## AddMovieToMovieList
You can execute the `AddMovieToMovieList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addMovieToMovieList(vars: AddMovieToMovieListVariables): MutationPromise<AddMovieToMovieListData, AddMovieToMovieListVariables>;

interface AddMovieToMovieListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToMovieListVariables): MutationRef<AddMovieToMovieListData, AddMovieToMovieListVariables>;
}
export const addMovieToMovieListRef: AddMovieToMovieListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addMovieToMovieList(dc: DataConnect, vars: AddMovieToMovieListVariables): MutationPromise<AddMovieToMovieListData, AddMovieToMovieListVariables>;

interface AddMovieToMovieListRef {
  ...
  (dc: DataConnect, vars: AddMovieToMovieListVariables): MutationRef<AddMovieToMovieListData, AddMovieToMovieListVariables>;
}
export const addMovieToMovieListRef: AddMovieToMovieListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addMovieToMovieListRef:
```typescript
const name = addMovieToMovieListRef.operationName;
console.log(name);
```

### Variables
The `AddMovieToMovieList` mutation requires an argument of type `AddMovieToMovieListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddMovieToMovieListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  position: number;
}
```
### Return Type
Recall that executing the `AddMovieToMovieList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddMovieToMovieListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddMovieToMovieListData {
  movieListEntry_insert: MovieListEntry_Key;
}
```
### Using `AddMovieToMovieList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addMovieToMovieList, AddMovieToMovieListVariables } from '@dataconnect/generated';

// The `AddMovieToMovieList` mutation requires an argument of type `AddMovieToMovieListVariables`:
const addMovieToMovieListVars: AddMovieToMovieListVariables = {
  movieListId: ..., 
  movieId: ..., 
  position: ..., 
};

// Call the `addMovieToMovieList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addMovieToMovieList(addMovieToMovieListVars);
// Variables can be defined inline as well.
const { data } = await addMovieToMovieList({ movieListId: ..., movieId: ..., position: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addMovieToMovieList(dataConnect, addMovieToMovieListVars);

console.log(data.movieListEntry_insert);

// Or, you can use the `Promise` API.
addMovieToMovieList(addMovieToMovieListVars).then((response) => {
  const data = response.data;
  console.log(data.movieListEntry_insert);
});
```

### Using `AddMovieToMovieList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addMovieToMovieListRef, AddMovieToMovieListVariables } from '@dataconnect/generated';

// The `AddMovieToMovieList` mutation requires an argument of type `AddMovieToMovieListVariables`:
const addMovieToMovieListVars: AddMovieToMovieListVariables = {
  movieListId: ..., 
  movieId: ..., 
  position: ..., 
};

// Call the `addMovieToMovieListRef()` function to get a reference to the mutation.
const ref = addMovieToMovieListRef(addMovieToMovieListVars);
// Variables can be defined inline as well.
const ref = addMovieToMovieListRef({ movieListId: ..., movieId: ..., position: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addMovieToMovieListRef(dataConnect, addMovieToMovieListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.movieListEntry_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.movieListEntry_insert);
});
```

