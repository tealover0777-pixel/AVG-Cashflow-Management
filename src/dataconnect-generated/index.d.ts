import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddMovieToMovieListData {
  movieListEntry_insert: MovieListEntry_Key;
}

export interface AddMovieToMovieListVariables {
  movieListId: UUIDString;
  movieId: UUIDString;
  position: number;
}

export interface CreateNewMovieListData {
  movieList_insert: MovieList_Key;
}

export interface CreateNewMovieListVariables {
  name: string;
  description?: string | null;
  isPublic: boolean;
  privateShareLink?: string | null;
}

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

export interface GetUserWatchHistoryVariables {
  userId: UUIDString;
}

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

export interface MovieListEntry_Key {
  movieListId: UUIDString;
  movieId: UUIDString;
  position: number;
  __typename?: 'MovieListEntry_Key';
}

export interface MovieList_Key {
  id: UUIDString;
  __typename?: 'MovieList_Key';
}

export interface Movie_Key {
  id: UUIDString;
  __typename?: 'Movie_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Watch_Key {
  id: UUIDString;
  __typename?: 'Watch_Key';
}

interface ListAllMoviesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMoviesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllMoviesData, undefined>;
  operationName: string;
}
export const listAllMoviesRef: ListAllMoviesRef;

export function listAllMovies(): QueryPromise<ListAllMoviesData, undefined>;
export function listAllMovies(dc: DataConnect): QueryPromise<ListAllMoviesData, undefined>;

interface GetUserWatchHistoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserWatchHistoryVariables): QueryRef<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserWatchHistoryVariables): QueryRef<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;
  operationName: string;
}
export const getUserWatchHistoryRef: GetUserWatchHistoryRef;

export function getUserWatchHistory(vars: GetUserWatchHistoryVariables): QueryPromise<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;
export function getUserWatchHistory(dc: DataConnect, vars: GetUserWatchHistoryVariables): QueryPromise<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;

interface CreateNewMovieListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateNewMovieListVariables): MutationRef<CreateNewMovieListData, CreateNewMovieListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateNewMovieListVariables): MutationRef<CreateNewMovieListData, CreateNewMovieListVariables>;
  operationName: string;
}
export const createNewMovieListRef: CreateNewMovieListRef;

export function createNewMovieList(vars: CreateNewMovieListVariables): MutationPromise<CreateNewMovieListData, CreateNewMovieListVariables>;
export function createNewMovieList(dc: DataConnect, vars: CreateNewMovieListVariables): MutationPromise<CreateNewMovieListData, CreateNewMovieListVariables>;

interface AddMovieToMovieListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToMovieListVariables): MutationRef<AddMovieToMovieListData, AddMovieToMovieListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddMovieToMovieListVariables): MutationRef<AddMovieToMovieListData, AddMovieToMovieListVariables>;
  operationName: string;
}
export const addMovieToMovieListRef: AddMovieToMovieListRef;

export function addMovieToMovieList(vars: AddMovieToMovieListVariables): MutationPromise<AddMovieToMovieListData, AddMovieToMovieListVariables>;
export function addMovieToMovieList(dc: DataConnect, vars: AddMovieToMovieListVariables): MutationPromise<AddMovieToMovieListData, AddMovieToMovieListVariables>;

