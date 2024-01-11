/**
 * Global Variable Configuration
 * (sails.config.globals)
 *
 * Configure which global variables which will be exposed
 * automatically by Sails.
 *
 * For more information on any of these options, check out:
 * https://sailsjs.com/config/globals
 */



module.exports.globals = {

  /****************************************************************************
  *                                                                           *
  * Whether to expose the locally-installed Lodash as a global variable       *
  * (`_`), making  it accessible throughout your app.                         *
  *                                                                           *
  ****************************************************************************/

  _: require('@sailshq/lodash'),
  
  /****************************************************************************
  *                                                                           *
  * This app was generated without a dependency on the "async" NPM package.   *
  *                                                                           *
  * > Don't worry!  This is totally unrelated to JavaScript's "async/await".  *
  * > Your code can (and probably should) use `await` as much as possible.    *
  *                                                                           *
  ****************************************************************************/

  async: false,

  /****************************************************************************
  *                                                                           *
  * Whether to expose each of your app's models as global variables.          *
  * (See the link at the top of this file for more information.)              *
  *                                                                           *
  ****************************************************************************/

  models: true,

  /****************************************************************************
  *                                                                           *
  * Whether to expose the Sails app instance as a global variable (`sails`),  *
  * making it accessible throughout your app.                                 *
  *                                                                           *
  ****************************************************************************/

  sails: true,

  tokenabsen : '123456',
  OneMeterToMiles : 0.000621371192,
  usernamesoap : 'IDR_IT',
  passwordsoap : 'Superman123',
  // usernamesoapdev : 'IT_01',
  // passwordsoapdev : 'Superman212',
  usernamesoapdev : 'IT_INTERFACE',
  passwordsoapdev : 'Superman212',
  ftphost : '192.168.1.148',
  ftpport : 22,
  ftpuser : 'sapftp',
  ftppassword : 'sapftp@2020',
  directory_do : 'Z:/elogistic/dolist/return',
  directory_do_dev : 'F:/deliveryorder/return',
  directory_fkr_request_dev : 'F:/fkr/request',
  directory_fkr_request : 'Z:/fkr/create/request',
  sodobill : 'D:/Latihan/ReactJS/apiesales/repo/sodobil/return',
  sodobill_dev : 'F:/sodobil',
  apikeygooglemap : 'AIzaSyCWM9M49URQpVayXqHc2XjIzMJU40Kb_ig',
  apiURL : 'http://localhost:1337/'

};
