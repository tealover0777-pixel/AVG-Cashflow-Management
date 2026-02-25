import { ListAllMoviesData, GetUserWatchHistoryData, GetUserWatchHistoryVariables, CreateNewMovieListData, CreateNewMovieListVariables, AddMovieToMovieListData, AddMovieToMovieListVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllMovies(options?: useDataConnectQueryOptions<ListAllMoviesData>): UseDataConnectQueryResult<ListAllMoviesData, undefined>;
export function useListAllMovies(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllMoviesData>): UseDataConnectQueryResult<ListAllMoviesData, undefined>;

export function useGetUserWatchHistory(vars: GetUserWatchHistoryVariables, options?: useDataConnectQueryOptions<GetUserWatchHistoryData>): UseDataConnectQueryResult<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;
export function useGetUserWatchHistory(dc: DataConnect, vars: GetUserWatchHistoryVariables, options?: useDataConnectQueryOptions<GetUserWatchHistoryData>): UseDataConnectQueryResult<GetUserWatchHistoryData, GetUserWatchHistoryVariables>;

export function useCreateNewMovieList(options?: useDataConnectMutationOptions<CreateNewMovieListData, FirebaseError, CreateNewMovieListVariables>): UseDataConnectMutationResult<CreateNewMovieListData, CreateNewMovieListVariables>;
export function useCreateNewMovieList(dc: DataConnect, options?: useDataConnectMutationOptions<CreateNewMovieListData, FirebaseError, CreateNewMovieListVariables>): UseDataConnectMutationResult<CreateNewMovieListData, CreateNewMovieListVariables>;

export function useAddMovieToMovieList(options?: useDataConnectMutationOptions<AddMovieToMovieListData, FirebaseError, AddMovieToMovieListVariables>): UseDataConnectMutationResult<AddMovieToMovieListData, AddMovieToMovieListVariables>;
export function useAddMovieToMovieList(dc: DataConnect, options?: useDataConnectMutationOptions<AddMovieToMovieListData, FirebaseError, AddMovieToMovieListVariables>): UseDataConnectMutationResult<AddMovieToMovieListData, AddMovieToMovieListVariables>;
