import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

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

/** Generated Node Admin SDK operation action function for the 'ListAllMovies' Query. Allow users to execute without passing in DataConnect. */
export function listAllMovies(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<ListAllMoviesData>>;
/** Generated Node Admin SDK operation action function for the 'ListAllMovies' Query. Allow users to pass in custom DataConnect instances. */
export function listAllMovies(options?: OperationOptions): Promise<ExecuteOperationResponse<ListAllMoviesData>>;

/** Generated Node Admin SDK operation action function for the 'GetUserWatchHistory' Query. Allow users to execute without passing in DataConnect. */
export function getUserWatchHistory(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserWatchHistoryData>>;
/** Generated Node Admin SDK operation action function for the 'GetUserWatchHistory' Query. Allow users to pass in custom DataConnect instances. */
export function getUserWatchHistory(options?: OperationOptions): Promise<ExecuteOperationResponse<GetUserWatchHistoryData>>;

/** Generated Node Admin SDK operation action function for the 'CreateNewMovieList' Mutation. Allow users to execute without passing in DataConnect. */
export function createNewMovieList(dc: DataConnect, vars: CreateNewMovieListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateNewMovieListData>>;
/** Generated Node Admin SDK operation action function for the 'CreateNewMovieList' Mutation. Allow users to pass in custom DataConnect instances. */
export function createNewMovieList(vars: CreateNewMovieListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<CreateNewMovieListData>>;

/** Generated Node Admin SDK operation action function for the 'AddMovieToMovieList' Mutation. Allow users to execute without passing in DataConnect. */
export function addMovieToMovieList(dc: DataConnect, vars: AddMovieToMovieListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddMovieToMovieListData>>;
/** Generated Node Admin SDK operation action function for the 'AddMovieToMovieList' Mutation. Allow users to pass in custom DataConnect instances. */
export function addMovieToMovieList(vars: AddMovieToMovieListVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<AddMovieToMovieListData>>;

