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
      query: {plant,bulan_tahun,m_user_id}
    } = req;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      


      let tahun = moment(bulan_tahun,'YYYYMM').format('YYYY');
      let bulan_dan_tahun = moment(bulan_tahun,'YYYYMM').format('MMM-YY');
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let tahun_label = moment(bulan_tahun,'YYYYMM').format('YY');
      let bulan_now = Number(moment().format('MM'));
      

 
      let sqlGetDataRaw = `SELECT DAY(rundate) as days,line,
        AVG(AR1) AR,AVG(QR1) QR,AVG(OEE1) OEE,AVG(PR1) PR
        FROM v_raw_oees vro WHERE plant_id='${plant}'
        AND YEAR(rundate) = ${tahun} 
        AND MONTH(rundate)='${bulan}'
        GROUP BY DAY(rundate),plant_id,line ORDER BY DAY(rundate)`;

      let data = await request.query(sqlGetDataRaw);
      let dataAll =  data.recordset;
      

      let vQr =[];
      let dayslabel = [];

      for (let i = 0; i < dataAll.length; i++) {
        let qr = dataAll[i] ? dataAll[i].QR : 0;
        let line = dataAll[i] ? dataAll[i].line : '';
        let days = dataAll[i] ? dataAll[i].days : '';
        dayslabel.push(pad(days));

        let data = {
          dayslabel:days,
          vQr:qr,
          line:line
        }

        vQr.push(data);

      }


      var o = vQr.reduce( (a,b) => {
        a[b.line] = a[b.line] || [];
        a[b.line].push({[b.dayslabel]:b.vQr});
        return a;
    }, {});

    var hasil = Object.keys(o).map(function(k) {
      return {line : k, data : Object.assign.apply({},o[k])};
    });


    let datasets = [];
    for (let i = 0; i < hasil.length; i++) {
      let line = hasil[i].line;
      let datas = hasil[i].data;
      let arr = sortObjectByKeys(datas);
      var result = Object.keys(arr).map((key) => arr[key]);

      let sqlgetColor = `SELECT TOP 1 color FROM oee_machinetbl WHERE plant = '${plant}' AND attrib1 = '${line}'`;
      //console.log(sqlgetColor);
      let datacolor = await request.query(sqlgetColor);
      let color = datacolor.recordset.length > 0 ? datacolor.recordset[0].color : 'yellow';

      let obj = {
        label : line,
        fill: false,
        backgroundColor: color,
        borderColor: color,
        pointRadius: 3,
        pointHoverRadius: 2,
        data : result
      }
      datasets.push(obj);
      
    }

      dayslabel = _.uniq(dayslabel);


      let chartOptionsQualityRate = {
        maintainAspectRatio : false,
        responsive : true,
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
              labelString: bulan_dan_tahun
            }
          }],
          yAxes: [{
            gridLines : {
              display : false,
            },
            display: true,
            scaleLabel: {
              display: true,
              labelString: 'Percentage (%)'
            },
            ticks: {
              beginAtZero: true,
            }
          }]
        },
      }




      let chartDataQualityRate = {
        labels: dayslabel,
        datasets: datasets,
        chartOptionsQualityRate:chartOptionsQualityRate
      }


      return res.success({
        result:chartDataQualityRate,
        message: "Submit data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },

  
}

function pad(d) {
  return (d < 10) ? '0' + d.toString() : d.toString();
}

function sortObjectByKeys(o) {
  return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
}