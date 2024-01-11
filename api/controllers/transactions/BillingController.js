/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */


  const fs = require("fs");
 
  module.exports = {
    // GET ALL RESOURCE
  
    findebupot: async function(req, res){
      const {
            query: {
              no_ebupot,
              fiscal_year,
              company_code,
              root
            }
        } = req;
  
        try {

          // baca semua file yg ada di direktory
          filenames = fs.readdirSync(`${root}:/${fiscal_year}/${company_code}`);
          let nama_file_baru = 'KOSONG';
          filenames.forEach(file => {
            if(file.includes(`${no_ebupot}_`)){
                nama_file_baru = file;
            }
          });
          const host = `${root}:/${fiscal_year}/${company_code}/${nama_file_baru}`;

          if(nama_file_baru=='KOSONG'){
            
            return res.error({
                message: "Kemungkinan dokument belum tersedia.."
            });

          }else{

            let direktori = host;
            stats = fs.statSync(direktori);
            return res.download(direktori);
    
          }

        } catch (error) {
          console.log(error);
          return res.error({
            message: "Kemungkinan dokument belum tersedia.."
          });
        }
        
    },

  
  };