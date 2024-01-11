const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {

  
  getPriode: async function (req, res) {
    // await DBPROP;

    const {
      query: { budget_year }
    } = req;
    try {
   
      let bulan = Number(moment().format('MM'));
      let yearnow = Number(moment().format('YYYY'));
      let yearfuture = yearnow + 1;


      const bulanRef = [
        {'id': 1, 'nama': 'Januari'},
        {'id': 2, 'nama': 'Februari'},
        {'id': 3, 'nama': 'Maret'},
        {'id': 4, 'nama': 'April'},
        {'id': 5, 'nama': 'Mei'},
        {'id': 6, 'nama': 'Juni'},
        {'id': 7, 'nama': 'Juli'},
        {'id': 8, 'nama': 'Agustus'},
        {'id': 9, 'nama': 'September'},
        {'id': 10, 'nama': 'Oktober'},
        {'id': 11, 'nama': 'November'},
        {'id': 12, 'nama': 'Desember'}
      ]

      let bulanArray = [];

      if(budget_year==yearfuture){
        
        for (let index = 1; index <= 12; index++) {
          let namaBulan = bulanRef.find(e => e.id == index);
          bulanArray.push(namaBulan);
        }
      
      }else{
        for (let index = bulan; index <= 12; index++) {

          let namaBulan = bulanRef.find(e => e.id == index);
          bulanArray.push(namaBulan);
        }
      }

      


      return res.success({
            result: bulanArray,
            message: "Fetch data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

}