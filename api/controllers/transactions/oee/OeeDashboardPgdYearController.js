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
      let bulan = moment(bulan_tahun,'YYYYMM').format('MM');
      let tahun_label = moment(bulan_tahun,'YYYYMM').format('YY');
      let bulan_now = Number(moment().format('MM'));


      let sqlGetDataRaw = `SELECT MONTH(rundate) AS periode,AVG(AR1) AR,AVG(QR1) QR,AVG(OEE1) OEE,AVG(PR1) PR 
      FROM v_raw_oees vro WHERE plant_id='${plant}' 
      AND YEAR(rundate) = ${tahun} GROUP BY MONTH(rundate),plant_id ORDER BY MONTH(rundate)`;
      //console.log(sqlGetDataRaw);
      let data = await request.query(sqlGetDataRaw);
      let dataAll =  data.recordset;
      let sqlGetTargetOee = `SELECT oee_target FROM oee_targettbl ot WHERE oee_year=${tahun} AND plant_id='${plant}'`;
      let getdataoee = await request.query(sqlGetTargetOee);
      let target = 0;

      //console.log(sqlGetTargetOee);
      for (let i = 0; i < getdataoee.recordset.length; i++) {
        target = target + getdataoee.recordset[i].oee_target;
      }

      if(target > 0 && getdataoee.recordset.length){
        target = target /  getdataoee.recordset.length;

      }
      
      // let sqlGetDataRaw = `select c1.periode as val_id, FORMAT(c1.date,'MMM-yy') as val_char, d1.plant_id, 
      // CAST(avg(d1.oee_target) AS DECIMAL(10,8)) as oeetarget,
      // COALESCE(x.pAR,0) as AR, COALESCE(x.pPR,0) as PR, COALESCE(x.pQR,0) as QR, COALESCE(x.pOEE,0) as OEE
      // from calendar_date c1 left outer join oee_targettbl d1 on (left(c1.periode,4)=d1.oee_year)
      // left outer join
      // (
      // select c.periode, FORMAT(c.date,'MMM-yy') as val_char, a.plant_id,  
      // COALESCE(CAST(avg(a.ar) AS DECIMAL(10,2)),0) as pAR, COALESCE(CAST(avg(a.pr)  AS DECIMAL(10,2)),0) as pPR, COALESCE(CAST(avg(a.qr) AS DECIMAL(10,2)),0) as pQR, 
      // COALESCE(CAST(avg(a.oee) AS DECIMAL(10,2)),0) as pOEE
      // from calendar_date c left outer join v_summ_oees a on
      // (c.periode=a.periode and a.plant_id='${plant}' and a.marea='ALL' and a.machineid='ALL')
      // where left(c.periode,4) = '${tahun}'
      // group by c.periode, FORMAT(c.date,'MMM-yy'), a.plant_id) x
      // on (c1.periode=x.periode and d1.plant_id=x.plant_id)
      // where left(c1.periode,4) = '${tahun}'
      // and d1.plant_id='${plant}'
      // group by c1.periode, FORMAT(c1.date,'MMM-yy'), d1.plant_id,x.pAR,x.pPR,x.pQR,x.pOEE`;

      let vAr =[];
      let vQr =[];
      let vOee =[];
      let vTargetOee =[];
      let vPr =[];

      let totalAverageAR = 0;
      let totalAverageQR = 0;
      let totalAveragePR = 0;
      let totalAverageOEE = 0;

      let oeeaverageperiod = dataAll.find(e => e.periode==bulan);
      //console.log(oeeaverageperiod);
      let avgOEEPeriod = oeeaverageperiod ? oeeaverageperiod.OEE ? Number(oeeaverageperiod.OEE.toFixed(2)) : 0 : 0;
      //console.log(avgOEEPeriod);

      for (let i = 0; i < 12; i++) {
        let ar = dataAll[i] ? dataAll[i].AR : 0;
        let qr = dataAll[i] ? dataAll[i].QR : 0;
        let pr = dataAll[i] ? dataAll[i].PR : 0;
        let oee = dataAll[i] ? dataAll[i].OEE : 0;

        totalAverageAR = totalAverageAR + ar;
        totalAverageQR = totalAverageQR + qr;
        totalAveragePR = totalAveragePR + pr;
        totalAverageOEE = totalAverageOEE + oee;

        vAr.push(ar);
        vQr.push(qr);
        vPr.push(pr);
        vOee.push(oee);
        vTargetOee.push(target);
      }


      let sqlgetSumOee = `select left(c1.periode,4) as periode, c1.plant_id, avg(c1.AR) as AR, avg(c1.PR) as PR,
      avg(c1.QR) as QR, avg(c1.OEE) as OEE, avg(t1.oee_target) as target
      from v_summ_oees c1, oee_targettbl t1
      where c1.plant_id=t1.plant_id
      and left(c1.periode,4)=t1.oee_year
      and left(c1.periode,4)= ${tahun}
      and c1.plant_id= '${plant}'
      group by left(c1.periode,4), c1.plant_id`;

      let dataSummary = await request.query(sqlgetSumOee);
      let dataSummaryAll =  dataSummary.recordset;

      let avgAr = dataSummaryAll.length > 0 ? dataSummaryAll[0].AR : 0;
      let avgQr = dataSummaryAll.length > 0 ? dataSummaryAll[0].QR : 0;
      let avgPr = dataSummaryAll.length > 0 ? dataSummaryAll[0].PR : 0;
      let avgOEE = dataSummaryAll.length > 0 ? dataSummaryAll[0].OEE : 0;
      let targetOEE = dataSummaryAll.length > 0 ? dataSummaryAll[0].target : 0;

      let datachart = {
        avgOEEPeriod:avgOEEPeriod,
        avgAr:Number(avgAr.toFixed(2)),
        avgQr:Number(avgQr.toFixed(2)),
        avgPr:Number(avgPr.toFixed(2)),
        avgOEE:Number(avgOEE.toFixed(2)),
        targetOEE:targetOEE.toFixed(2),
        labels: [
          `Jan-${tahun_label}`, `Feb-${tahun_label}`, `Mar-${tahun_label}`, `Apr-${tahun_label}`, `May-${tahun_label}`, `Jun-${tahun_label}`, `Jul-${tahun_label}`, `Aug-${tahun_label}`, `Sept-${tahun_label}`, `Oct-${tahun_label}`, `Nov-${tahun_label}`, `Dec-${tahun_label}`
        ],
        datasets: [
          {
            label: "AR",
            fill: false,
            backgroundColor: 'red',
            borderColor: 'red',
            pointRadius: 6,
            pointHoverRadius: 3,
            data: vAr
          },
          {
            label: "PR",
            fill: false,
            backgroundColor: 'green',
            borderColor: 'green',
            pointRadius: 6,
            pointHoverRadius: 3,
            data: vPr
          },
          {
            label: "QR",
            fill: false,
            backgroundColor: 'yellow',
            borderColor: 'yellow',
            pointRadius: 6,
            pointHoverRadius: 3,
            data: vQr
          },
          {
            label: "OEE",
            fill: false,
            backgroundColor: 'blue',
            borderColor: 'blue',
            pointRadius: 6,
            pointHoverRadius: 3,
            data: vOee
          },
            {
            label: "TARGET OEE",
            fill: false,
            backgroundColor     : 'rgba(210, 214, 222, 1)',
            borderColor         : 'rgba(210, 214, 222, 1)',
            pointRadius         : 6,
            data: vTargetOee
          }
        ]
      }


      return res.success({
        result:datachart,
        message: "Submit data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },

  
}

