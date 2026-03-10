const { validateAdminArgs } = require('firebase-admin/data-connect');

const connectorConfig = {
  connector: 'example',
  serviceId: 'avgcashflowmanagement',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

function listAllMovies(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAllMovies', undefined, inputOpts);
}
exports.listAllMovies = listAllMovies;

function getUserWatchHistory(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetUserWatchHistory', undefined, inputOpts);
}
exports.getUserWatchHistory = getUserWatchHistory;

function createNewMovieList(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateNewMovieList', inputVars, inputOpts);
}
exports.createNewMovieList = createNewMovieList;

function addMovieToMovieList(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddMovieToMovieList', inputVars, inputOpts);
}
exports.addMovieToMovieList = addMovieToMovieList;

