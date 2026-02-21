import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'avgcashflowmanagement',
  location: 'us-central1'
};

export const listAllMoviesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMovies');
}
listAllMoviesRef.operationName = 'ListAllMovies';

export function listAllMovies(dc) {
  return executeQuery(listAllMoviesRef(dc));
}

export const getUserWatchHistoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserWatchHistory', inputVars);
}
getUserWatchHistoryRef.operationName = 'GetUserWatchHistory';

export function getUserWatchHistory(dcOrVars, vars) {
  return executeQuery(getUserWatchHistoryRef(dcOrVars, vars));
}

export const createNewMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewMovieList', inputVars);
}
createNewMovieListRef.operationName = 'CreateNewMovieList';

export function createNewMovieList(dcOrVars, vars) {
  return executeMutation(createNewMovieListRef(dcOrVars, vars));
}

export const addMovieToMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToMovieList', inputVars);
}
addMovieToMovieListRef.operationName = 'AddMovieToMovieList';

export function addMovieToMovieList(dcOrVars, vars) {
  return executeMutation(addMovieToMovieListRef(dcOrVars, vars));
}

