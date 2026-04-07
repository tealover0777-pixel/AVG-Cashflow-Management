import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

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

export function listAllMovies(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMoviesRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

export const getUserWatchHistoryRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserWatchHistory');
}
getUserWatchHistoryRef.operationName = 'GetUserWatchHistory';

export function getUserWatchHistory(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(getUserWatchHistoryRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

export const createNewMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewMovieList', inputVars);
}
createNewMovieListRef.operationName = 'CreateNewMovieList';

export function createNewMovieList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createNewMovieListRef(dcInstance, inputVars));
}

export const addMovieToMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToMovieList', inputVars);
}
addMovieToMovieListRef.operationName = 'AddMovieToMovieList';

export function addMovieToMovieList(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(addMovieToMovieListRef(dcInstance, inputVars));
}

