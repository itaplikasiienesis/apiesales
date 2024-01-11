/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const mssql = require('mssql')
 const bcrypt = require('bcryptjs')
 const xlsx = require('node-xlsx');
 const axios = require('axios');
 
 module.exports = {

   send: async function(req, res) {
    let data = req.body;

    try {

          var paramCreate = [];
          for (let i = 1; i <= 100; i++) {
              paramCreate.push(data);   
          }

          for (let i = 0;  i < paramCreate.length; i++) {
              let nomor = `TIAS`.concat(i);
              delete paramCreate[i].nomorAju;
              //paramCreate[i].nomorAju = nomor;
          }


          for (let i = 0;  i < paramCreate.length; i++) {
            let nomor = `TIAS`.concat(i);
            console.log(nomor);
            paramCreate[i].nomorAju = nomor;
            //console.log(paramCreate[i].nomorAju);

          }

         
          const json = JSON.stringify(paramCreate);
          const res = await axios.post('https://apisdev-gw.beacukai.go.id/barkir-service/cnpibk/kirim-data-test2', json, {
            headers: {
              // Overwrite Axios's automatically set Content-Type
              'Content-Type': 'application/json',
              'beacukai-api-key':'04736030-6614-4138-ab10-6ef1f8210642'
            }
          });


      

        return res.success({
          message: "Hit Enpoint Barkir successfully"
        });
    } catch (err) {
      return res.error(err);
    }
  },
 
  
 };
 