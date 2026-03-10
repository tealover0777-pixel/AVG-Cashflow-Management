import { validateAdminArgs } from 'firebase-admin/data-connect';

export const connectorConfig = {
  connector: 'example',
  serviceId: 'avgcashflowmanagement',
  location: 'us-central1'
};

export function listAllMovies(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('ListAllMovies', undefined, inputOpts);
}

export function getUserWatchHistory(dcOrOptions, options) {
  const { dc: dcInstance, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrOptions, options, undefined);
  dcInstance.useGen(true);
  return dcInstance.executeQuery('GetUserWatchHistory', undefined, inputOpts);
}

export function createNewMovieList(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('CreateNewMovieList', inputVars, inputOpts);
}

export function addMovieToMovieList(dcOrVarsOrOptions, varsOrOptions, options) {
  const { dc: dcInstance, vars: inputVars, options: inputOpts} = validateAdminArgs(connectorConfig, dcOrVarsOrOptions, varsOrOptions, options, true, true);
  dcInstance.useGen(true);
  return dcInstance.executeMutation('AddMovieToMovieList', inputVars, inputOpts);
}

