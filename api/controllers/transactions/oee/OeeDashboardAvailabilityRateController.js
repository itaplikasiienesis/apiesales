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

      let startOfMonth = Number(moment(bulan_tahun,'YYYYMM').startOf('month').format('DD'));
      let endOfMonth   = Number(moment(bulan_tahun,'YYYYMM').endOf('month').format('DD'));


      // console.log('startOfMonth ',startOfMonth);
      // console.log('endOfMonth ',endOfMonth);
 
      let sqlGetDataRaw = `SELECT DAY(rundate) as days,line,
        AVG(AR1) AR,AVG(QR1) QR,AVG(OEE1) OEE,AVG(PR1) PR
        FROM v_raw_oees vro WHERE plant_id='${plant}'
        AND YEAR(rundate) = ${tahun} 
        AND MONTH(rundate)='${bulan}'
        GROUP BY DAY(rundate),plant_id,line ORDER BY DAY(rundate)`;

      let data = await request.query(sqlGetDataRaw);
      let dataAll =  data.recordset;


      let arrayLine = ['LINE1','LINE2','LINE3'];
      // console.log(dataAll);
      
      let dayslabelReal = [];
      for (let index = startOfMonth; index <= endOfMonth ; index++) {
        
            dayslabelReal.push(pad(index));
        
      }

      let vAr =[];
     
      let dayslabel = [];
      for (let i = 0; i < dataAll.length; i++) {
        let ar = dataAll[i] ? dataAll[i].AR : 0;
        let line = dataAll[i] ? dataAll[i].line : '';
        let days = dataAll[i] ? dataAll[i].days : '';
        dayslabel.push(pad(days));

        let data = {
          dayslabel:days,
          vAr:ar,
          line:line
        }

        vAr.push(data);

      }

      //console.log(vAr);

    let o = vAr.reduce( (a,b) => {
        a[b.line] = a[b.line] || [];
        a[b.line].push({[b.dayslabel]:b.vAr});
        return a;
    }, {});

    let hasil = Object.keys(o).map(function(k) {
      return {line : k, data : Object.assign.apply({},o[k])};
    });

    
    const hasilDataSisipan = sisipkanNilai(hasil, endOfMonth);
    //console.log(hasilDataSisipan);
    let datasets = [];
    for (let i = 0; i < hasilDataSisipan.length; i++) {
      let line = hasilDataSisipan[i].line;
      let datas = hasilDataSisipan[i].data;
      let arr = sortObjectByKeys(datas);
      var result = Object.keys(arr).map((key) => arr[key]);

      let sqlgetColor = `SELECT TOP 1 color FROM oee_machinetbl WHERE plant = '${plant}' AND attrib1 = '${line}'`;
      //console.log(sqlgetColor);
      let datacolor = await request.query(sqlgetColor);
      let color = datacolor.recordset.length > 0 ? datacolor.recordset[0].color : 'yellow';

      //console.log(result);

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

    let chartOptionsAvailabilityRate = {
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

      dayslabelReal = _.uniq(dayslabelReal);
      let chartDataAvailabilityRate = {
        labels: dayslabelReal,
        datasets: datasets,
        chartOptionsAvailabilityRate:chartOptionsAvailabilityRate
      }


      //console.log(chartDataAvailabilityRate);

      return res.success({
        result:chartDataAvailabilityRate,
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




const sisipkanNilai = (sumberData, endDate) => {
  for (const perData of sumberData) {
    // console.log('perData', perData)
    for (let i = 1; i <= endDate; i++){
      if (perData.data[i+'']) {
        //ignore
      } else {
        perData.data[i+''] = 0
      }
    }      
  }
// console.log('sumberData', sumberData)
return sumberData
}