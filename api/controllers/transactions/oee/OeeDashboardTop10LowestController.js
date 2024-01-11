const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const otpGenerator = require('otp-generator');
const mssql = require('mssql');
const moment = require('moment');
const xml2js = require('xml2js');
const numeral = require('numeral');
const bcrypt = require('bcryptjs');
const path = require('path');
const Client = require('ftp');
const fs = require('fs');
const ClientSFTP = require('ssh2-sftp-client');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);


module.exports = {
  // GET ALL RESOURCE
  find: async function(req, res) {
    const {
      query: {plant,tahun,m_user_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();


      console.log('plant ',plant);

      let sqlGetDataRaw = `SELECT top 10 left(v.periode,4), v.plant_id, v.machineid, v.machinename, COALESCE(avg(v.oee),1) as avoee FROM v_summ_oees v
      where left(v.periode,4)='${tahun}'
      and v.plant_id='${plant}'
      and v.marea='FILL'
      and v.machineid <> 'ALL'
      group by left(v.periode,4), v.plant_id, v.machineid, v.machinename
      order by COALESCE(avg(v.oee),1) ASC`;
      let data = await request.query(sqlGetDataRaw);
      let dataAll =  data.recordset;
      //console.log(dataAll);


      let machinename = [];
      let avoee = [];
      for (let i = 0; i < dataAll.length; i++) {
          let mesin = dataAll[i].machinename;
          let nilai = dataAll[i].avoee;
          machinename.push(mesin);
          avoee.push(nilai);
      }


      let chartDataLowestOEEMachine = {
        labels: machinename,
        datasets: [
          {
            label: "OEE",
            backgroundColor: ["#FF0000", "#FA8072","#FF6347","#C71585","#FF4500","#DB7093","#F08080","#FFA07A","#CD5C5C","#B22222"],
            borderWidth: 2,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 2,
            data: avoee
          }
        ]
      }


      let chartOptionsLowestOEEMachine = {
        responsive: true,
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            padding:25,                           
            boxWidth: 8
          }
        },
        scales: {
          xAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Percentage (%)'    
            }
          }],
          yAxes: [{
            gridLines : {
              display : false,
            },
            display: true,
            scaleLabel: {
              display: false
            },
            ticks: {
              beginAtZero: true,
            }
          }],
        },
        title: {
          display: true,
          text: `TOP 10 LOWEST OEE MACHINE  (FILLING) ${plant}  YEAR ${tahun}`
        },
      }


      let datachart = {
        chartDataLowestOEEMachine:chartDataLowestOEEMachine,
        chartOptionsLowestOEEMachine:chartOptionsLowestOEEMachine
      }

      //console.log(datachart);

      return res.success({
        result:datachart
      });


    } catch (err) {
      return res.error(err);
    }
  },

  findTable: async function(req, res) {
    const {
      query: {plant,bulan_tahun,param}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();



      let sqlGetDataRaw = `select x.periode, x.plant_id, x.marea, x.line, b.val_char, x.machineid, x.machinename, 
      x.AR as AR, x.PR as PR, 
      x.QR as QR, x.OEE as OEE from v_summ_oees x, mst_settings b
      where x.machineid<>'ALL'
      and x.periode ='${bulan_tahun}'
      and x.plant_id='${plant}'
      and x.${param} in (
      select min(y.${param})  from v_summ_oees y where 
      x.periode=y.periode
      and x.plant_id=y.plant_id
      and x.marea=y.marea
      and x.line=y.line
      )
      and b.val_tag='ATTR_MSN'
      and x.line=b.val_id
      group by periode, plant_id, line, machineid,marea,val_char,machinename,AR,PR,QR,OEE
      order by line, marea, x.${param} asc`;



      let data = await request.query(sqlGetDataRaw);
      let dataAll =  data.recordset;
      //console.log(dataAll);


      return res.success({
        result:dataAll
      });


    } catch (err) {
      return res.error(err);
    }
  }



  
}

