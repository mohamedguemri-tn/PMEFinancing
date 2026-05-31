export const environment = {
  production: true,
  development: false,
  apiUrl: '/api',  // relative — nginx proxies /api to backend:5002
  contractAddress: '',  // set at runtime via MetaMask (not needed by frontend)
  loanManagerAddress: '',  // set at runtime via MetaMask
};
