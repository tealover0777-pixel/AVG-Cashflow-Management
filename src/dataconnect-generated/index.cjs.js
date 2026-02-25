const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'avgcashflowmanagement',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

const listAllMoviesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMovies');
}
listAllMoviesRef.operationName = 'ListAllMovies';
exports.listAllMoviesRef = listAllMoviesRef;

exports.listAllMovies = function listAllMovies(dc) {
  return executeQuery(listAllMoviesRef(dc));
};

const getUserWatchHistoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserWatchHistory', inputVars);
}
getUserWatchHistoryRef.operationName = 'GetUserWatchHistory';
exports.getUserWatchHistoryRef = getUserWatchHistoryRef;

exports.getUserWatchHistory = function getUserWatchHistory(dcOrVars, vars) {
  return executeQuery(getUserWatchHistoryRef(dcOrVars, vars));
};

const createNewMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateNewMovieList', inputVars);
}
createNewMovieListRef.operationName = 'CreateNewMovieList';
exports.createNewMovieListRef = createNewMovieListRef;

exports.createNewMovieList = function createNewMovieList(dcOrVars, vars) {
  return executeMutation(createNewMovieListRef(dcOrVars, vars));
};

const addMovieToMovieListRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AddMovieToMovieList', inputVars);
}
addMovieToMovieListRef.operationName = 'AddMovieToMovieList';
exports.addMovieToMovieListRef = addMovieToMovieListRef;

exports.addMovieToMovieList = function addMovieToMovieList(dcOrVars, vars) {
  return executeMutation(addMovieToMovieListRef(dcOrVars, vars));
};
