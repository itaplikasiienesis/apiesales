/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const DBPROP = require("../../../services/DBPROPOSAL");
const fs = require('fs');
const soapRequest = require('easy-soap-request');
const Base64 = require('base-64');
const xml2js = require('xml2js');
const _ = require('lodash')

 module.exports = {
 
   // GET ONE RESOURCE
   klaim: async function(req, res) {
     
    const {
        query: {kode_distributor}
      } = req;
     await DB.poolConnect;
     
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();

        let sqlCheckPajak = `SELECT * FROM m_pajak WHERE kode = '${kode_distributor}'`;
        let dataSoldto = await request.query(sqlCheckPajak);
        let statusSoldto = dataSoldto.recordset;

        //console.log(statusSoldto);


        let sqlCheckDistributor = `SELECT * FROM m_distributor_v WHERE kode = '${kode_distributor}'`;
        //console.log(sqlCheckDistributor);
        let dataShipto = await request.query(sqlCheckDistributor);
        let statusShipto = dataShipto.recordset;

        let whereLevelPajak = ``;
        if(statusSoldto.length > 0){
            whereLevelPajak = `AND m_pajak_id = '${statusSoldto[0].m_pajak_id}'`;
        }


        let whereLevelDistributor = ``;
        if(statusShipto.length > 0){
            whereLevelDistributor = `AND m_distributor_id = '${statusShipto[0].m_distributor_id}'`;
        }



        let queryDataTable = `SELECT kd.nomor_proposal,kd.budget_awal,
        SUM(kd.total_klaim) AS total_klaim,kd.budget_awal - SUM(kd.total_klaim) AS outstanding FROM klaim k,klaim_detail kd 
         WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
         AND k.isactive = 'Y'
         AND k.klaim_id  = kd.klaim_id 
         AND k.kode_status IN('DR')
`
       
        //console.log(queryDataTable);
       
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }

         let row = result.recordset;
         //row.totalPending = row.length;

         let obj = {
             totalPending : row.length,
             data : row
         }
         
    
         return res.success({
           result: obj,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },

   dataFkr: async function(req, res) {
     
    const {
        query: {kode_distributor,start_date,end_date}
      } = req;
     await DBPROD.poolConnect;
     
     try {
    
        let pemusnahan = await getFkByJenis(kode_distributor,start_date,end_date,'Pemusnahan Lokal');
        let recall = await getFkByJenis(kode_distributor,start_date,end_date,'Product Recall / Delisting');
        let overstock = await getFkByJenis(kode_distributor,start_date,end_date,'Over Stock');
        let peralihan_mi = await getFkByJenis(kode_distributor,start_date,end_date,'Peralihan MI');
        let peralihan_distributor = await getFkByJenis(kode_distributor,start_date,end_date,'Peralihan Distributor');
        

        let obj = {
          pemusnahan:pemusnahan,
          recall:recall,
          overstock:overstock,
          peralihan_mi:peralihan_mi,
          peralihan_distributor:peralihan_distributor
        }

        return res.success({
          result:obj,
          message: "Fetch data successfully"
         });
              
     } catch (err) {
       return res.error(err);
     }
   },
   TrackingStatus: async function(req, res) {
     
    const {
        query: {kode_distributor,start_date,end_date}
      } = req;
    
    //console.log(req.query);
     await DB.poolConnect;
     
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();

        let sqlCheckPajak = `SELECT * FROM m_pajak WHERE kode = '${kode_distributor}'`;
        let dataSoldto = await request.query(sqlCheckPajak);
        let statusSoldto = dataSoldto.recordset;



        let sqlCheckDistributor = `SELECT * FROM m_distributor_v WHERE kode = '${kode_distributor}'`;
        let dataShipto = await request.query(sqlCheckDistributor);
        let statusShipto = dataShipto.recordset;

        let whereLevelPajak = ``;
        if(statusSoldto.length > 0){
            whereLevelPajak = `AND m_pajak_id = '${statusSoldto[0].m_pajak_id}'`;
        }


        let whereLevelDistributor = ``;
        if(statusShipto.length > 0){
            whereLevelDistributor = `AND m_distributor_id = '${statusShipto[0].m_distributor_id}'`;
        }

        

        let queryDataTablePengajuan = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('DR')
        AND k.jenis_klaim = 'INFRA'`;

        //console.log(queryDataTablePengajuan);

        let dataklaimpengajuan = await request.query(queryDataTablePengajuan);
        let klaimpengajuan = dataklaimpengajuan.recordset.length > 0 ? dataklaimpengajuan.recordset[0].total_klaim : 0;



        let queryDataTableVerifikasiSales = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('VER')
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimverifikasisales = await request.query(queryDataTableVerifikasiSales);
        let verifikasisales = dataklaimverifikasisales.recordset.length > 0 ? dataklaimverifikasisales.recordset[0].total_klaim : 0;


        let queryDataTableVerifikasiAccounting = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('VERACC')
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimverifikasiaccounting = await request.query(queryDataTableVerifikasiAccounting);
        let verifikasiaccounting = dataklaimverifikasiaccounting.recordset.length > 0 ? dataklaimverifikasiaccounting.recordset[0].total_klaim : 0;

        let queryDataTableKlaimMpd = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('MPD')
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimMpd = await request.query(queryDataTableKlaimMpd);
        let klaimMpd = dataklaimMpd.recordset.length > 0 ? dataklaimMpd.recordset[0].total_klaim : 0;



        let queryDataTableKlaimDta = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('DTA')
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimDta = await request.query(queryDataTableKlaimDta);
        let klaimDta = dataklaimDta.recordset.length > 0 ? dataklaimDta.recordset[0].total_klaim : 0;


        let queryDataTableKlaimDvs = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('DVS')
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimDvs = await request.query(queryDataTableKlaimDvs);
        let klaimDvs = dataklaimDvs.recordset.length > 0 ? dataklaimDvs.recordset[0].total_klaim : 0;



        let queryDataTableKlaimApr = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('APR')
        
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimApr = await request.query(queryDataTableKlaimApr);
        let klaimApr = dataklaimApr.recordset.length > 0 ? dataklaimApr.recordset[0].total_klaim : 0;



        let queryDataTableKlaimApn = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('APN')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimApn = await request.query(queryDataTableKlaimApn);
        let klaimApn = dataklaimApn.recordset.length > 0 ? dataklaimApn.recordset[0].total_klaim : 0;


        let queryDataTableKlaimTpf = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('TDF')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimTdf = await request.query(queryDataTableKlaimTpf);
        let klaimTdf = dataklaimTdf.recordset.length > 0 ? dataklaimTdf.recordset[0].total_klaim : 0;


        let queryDataTableKlaimApf = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('APF')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimApf = await request.query(queryDataTableKlaimApf);
        let klaimApf = dataklaimApf.recordset.length > 0 ? dataklaimApf.recordset[0].total_klaim : 0;


        let queryDataTableKlaimSkp = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('SKP')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimSkp = await request.query(queryDataTableKlaimSkp);
        let klaimSkp = dataklaimSkp.recordset.length > 0 ? dataklaimSkp.recordset[0].total_klaim : 0;

        let queryDataTableKlaimPay = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('PAY')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimPay = await request.query(queryDataTableKlaimPay);
        let klaimPay = dataklaimPay.recordset.length > 0 ? dataklaimPay.recordset[0].total_klaim : 0;

        let queryDataTableKlaimEbp = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('EBP')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND k.jenis_klaim = 'INFRA'`;

        let dataklaimEbp = await request.query(queryDataTableKlaimEbp);
        let klaimEbp = dataklaimEbp.recordset.length > 0 ? dataklaimEbp.recordset[0].total_klaim : 0;

        let total = klaimpengajuan + verifikasisales + verifikasiaccounting + 
        klaimMpd + klaimDta + klaimDvs + klaimApr + klaimApn + 
        klaimTdf + klaimApf + klaimSkp + klaimPay + klaimEbp;


        // Cek Jenis Non Infra


        let queryDataTablePengajuanNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('DR')
        AND (k.jenis_klaim = 'NON INFRA')`;

        //console.log(queryDataTablePengajuan);

        let dataklaimpengajuanNon = await request.query(queryDataTablePengajuanNon);
        let klaimpengajuanNon = dataklaimpengajuanNon.recordset.length > 0 ? dataklaimpengajuanNon.recordset[0].total_klaim : 0;



        let queryDataTableVerifikasiSalesNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('VER')
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimverifikasisalesNon = await request.query(queryDataTableVerifikasiSalesNon);
        let verifikasisalesNon = dataklaimverifikasisalesNon.recordset.length > 0 ? dataklaimverifikasisalesNon.recordset[0].total_klaim : 0;


        let queryDataTableVerifikasiAccountingNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('VERACC')
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimverifikasiaccountingNon = await request.query(queryDataTableVerifikasiAccountingNon);
        let verifikasiaccountingNon = dataklaimverifikasiaccountingNon.recordset.length > 0 ? dataklaimverifikasiaccountingNon.recordset[0].total_klaim : 0;

        let queryDataTableKlaimMpdNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('MPD')
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimMpdNon = await request.query(queryDataTableKlaimMpdNon);
        let klaimMpdNon = dataklaimMpdNon.recordset.length > 0 ? dataklaimMpdNon.recordset[0].total_klaim : 0;



        let queryDataTableKlaimDtaNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('DTA')
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimDtaNon = await request.query(queryDataTableKlaimDtaNon);
        let klaimDtaNon = dataklaimDtaNon.recordset.length > 0 ? dataklaimDtaNon.recordset[0].total_klaim : 0;


        let queryDataTableKlaimDvsNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('DVS')
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimDvsNon = await request.query(queryDataTableKlaimDvsNon);
        let klaimDvsNon = dataklaimDvsNon.recordset.length > 0 ? dataklaimDvsNon.recordset[0].total_klaim : 0;



        let queryDataTableKlaimAprNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('APR')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimAprNon = await request.query(queryDataTableKlaimAprNon);
        let klaimAprNon = dataklaimAprNon.recordset.length > 0 ? dataklaimAprNon.recordset[0].total_klaim : 0;



        let queryDataTableKlaimApnNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('APN')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimApnNon = await request.query(queryDataTableKlaimApnNon);
        let klaimApnNon = dataklaimApnNon.recordset.length > 0 ? dataklaimApnNon.recordset[0].total_klaim : 0;


        let queryDataTableKlaimTpfNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('TPF')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimTdfNon = await request.query(queryDataTableKlaimTpfNon);
        let klaimTpfNon = dataklaimTdfNon.recordset.length > 0 ? dataklaimTdfNon.recordset[0].total_klaim : 0;


        let queryDataTableKlaimApfNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('APF')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimApfNon = await request.query(queryDataTableKlaimApfNon);
        let klaimApfNon = dataklaimApfNon.recordset.length > 0 ? dataklaimApfNon.recordset[0].total_klaim : 0;


        let queryDataTableKlaimSkpNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('SKP')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimSkpNon = await request.query(queryDataTableKlaimSkpNon);
        let klaimSkpNon = dataklaimSkpNon.recordset.length > 0 ? dataklaimSkpNon.recordset[0].total_klaim : 0;

        let queryDataTableKlaimPayNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('PAY')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        let dataklaimPayNon = await request.query(queryDataTableKlaimPayNon);
        let klaimPayNon = dataklaimPayNon.recordset.length > 0 ? dataklaimPayNon.recordset[0].total_klaim : 0;

        let queryDataTableKlaimEpbNon = `SELECT
        COALESCE(SUM(kd.total_klaim),0) AS total_klaim FROM klaim k,klaim_detail kd 
        WHERE 1=1 ${whereLevelPajak} ${whereLevelDistributor}
        AND k.isactive = 'Y'
        AND k.klaim_id  = kd.klaim_id 
        AND k.kode_status IN('EBP')
        AND k.created BETWEEN '${start_date}' AND '${end_date}'
        AND (k.jenis_klaim = 'NON INFRA')`;

        //console.log(queryDataTableKlaimEpbNon);

        let dataklaimEbpNon = await request.query(queryDataTableKlaimEpbNon);
        let klaimEbpNon = dataklaimEbpNon.recordset.length > 0 ? dataklaimEbpNon.recordset[0].total_klaim : 0;

        let totalNon = klaimpengajuanNon + verifikasisalesNon + verifikasiaccountingNon + 
        klaimMpdNon + klaimDtaNon + klaimDvsNon + klaimAprNon + klaimApnNon + 
        klaimTpfNon + klaimApfNon + klaimSkpNon + klaimPayNon + klaimEbpNon;

        let obj = {
            statusinfra :{
              DR:{
                value:klaimpengajuan,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=DR'
              },
              VER:{
                value:verifikasisales,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=VER'
              },
              VERACC:{
                value:verifikasiaccounting,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=VERACC'
              },
              MPD:{
                value:klaimMpd,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=MPD'
              },
              DTA:{
                value:klaimDta,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=DTA'
              },
              DVS:{
                value:klaimDvs,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=DVS'
              },
              APR:{
                value:klaimApr,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=APR'
              },
              APN:{
                value:klaimApn,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=APN'
              },
              TDF:{
                value:klaimTdf,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=TDF'
              },
              APF:{
                value:klaimApf,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=APF'
              },
              SKP:{
                value:klaimSkp,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=SKP'
              },
              PAY:{
                value:klaimPay,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=PAY'
              },
              EBP:{
                value:klaimEbp,
                url:'/distributor/klaim-proposal?jenis_klaim=INFRA&status=EBP'
              },
              TOTAL: total
            },
            statusnoninfra :{
              DR:{
                value:klaimpengajuanNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=VER'
              },
              VER:{
                value:verifikasisalesNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=VER'
              },
              VERACC:{
                value:verifikasiaccountingNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=VERACC'
              },
              MPD:{
                value:klaimMpdNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=MPD'
              },
              DTA:{
                value:klaimDtaNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=DTA'
              },
              DVS:{
                value:klaimDvsNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=DVS'
              },
              APR:{
                value:klaimAprNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=APR'
              },
              APN:{
                value:klaimApnNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=APN'
              },
              TDF:{
                value:klaimTpfNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=TDF'
              },
              APF:{
                value:klaimApfNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=APF'
              },
              SKP:{
                value:klaimSkpNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=SKP'
              },
              PAY:{
                value:klaimPayNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=PAY'
              },
              EBP:{
                value:klaimEbpNon,
                url:'/distributor/klaim-proposal?jenis_klaim=NON%20INFRA&status=EBP'
              },
              TOTAL:totalNon
            }

        }

        //console.log(obj);
      
 
      return res.success({
        result: obj,
        message: "Fetch data successfully"
      });

        
     } catch (err) {
       return res.error(err);
     }
   },
   purchase: async function(req, res) {
     
    const {
        query: {kode_distributor}
      } = req;
     await DB.poolConnect;
     
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();


        let queryDataTable = `SELECT c.nomor_cmo,(COALESCE(c.tonase_1,0) + COALESCE(c.tonase_2,0)  + COALESCE(c.tonase_3,0)  + COALESCE(c.tonase_4,0)) AS tonase,
        (COALESCE(c.kubikasi_1 ,0) + COALESCE(c.kubikasi_2,0)  + COALESCE(c.kubikasi_3,0)  + COALESCE(c.kubikasi_4,0)) AS kubikasi,
        SUM(cd.bruto) AS bruto 
        FROM cmo_v c,cmo_detail cd 
        WHERE c.isactive = 'Y' AND c.no_sap IS NULL AND c.tahun NOT IN('2020','2021')  AND c.flow <> 0
        AND c.cmo_id  = cd.cmo_id
        AND c.r_organisasi_id IN(
        SELECT DISTINCT muo.r_organisasi_id FROM m_user ro,m_user_organisasi muo 
        where ro.username ='${kode_distributor}'
        AND ro.m_user_id = muo.m_user_id
        )
        GROUP  BY c.nomor_cmo,c.tonase_1,c.tonase_2,c.tonase_3,c.tonase_4,c.kubikasi_1,c.kubikasi_2,c.kubikasi_3,c.kubikasi_4`
              
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }

         let row = result.recordset;
         //row.totalPending = row.length;

         let obj = {
             totalPending : row.length,
             data : row
         }
         
         
    
         return res.success({
           result: obj,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   topBrandCmo: async function(req, res) {
     
    const {
        query: {kode_distributor}
      } = req;
     await DB.poolConnect;
     
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();


        let queryDataTable = `SELECT TOP 5 mp.kode_sap,mp.kode as kode_mi,mp.nama,
        SUM(cd.total_order) AS total_order
        FROM cmo_v c,cmo_detail cd,m_produk mp 
        WHERE c.isactive = 'Y' AND c.no_sap IS NULL AND c.tahun NOT IN('2020','2021')  AND c.flow <> 0
        AND c.cmo_id  = cd.cmo_id
        AND cd.total_order > 0
        AND cd.m_produk_id  = mp.m_produk_id 
        AND c.r_organisasi_id IN(
        SELECT DISTINCT muo.r_organisasi_id FROM m_user ro,m_user_organisasi muo 
        WHERE ro.username = '${kode_distributor}'
        AND ro.m_user_id = muo.m_user_id
        ) 
        GROUP BY mp.kode_sap,mp.kode,mp.nama
        ORDER BY total_order DESC`
              
       request.query(queryDataTable, async (err, result) => {
         if (err) {
           return res.error(err);
         }

         let row = result.recordset;
         //row.totalPending = row.length;

         let obj = {
             totalPending : row.length,
             data : row
         }
         
    
         return res.success({
           result: obj,
           message: "Fetch data successfully"
         });
       });
     } catch (err) {
       return res.error(err);
     }
   },
 
   dataSo: async function(req, res) {
     
    const {
        query: {kode_distributor,start_date,end_date}
      } = req;
     await DB.poolConnect;
     await DBPROD.poolConnect;
     //console.log(req.query);
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();
       const requestprod = DBPROD.pool.request();
       

       let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
       let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
       let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

       let kode_pajak = ``;
       if(kode_distributor){
          kode_pajak = '000'.concat(kode_distributor);
       }else{
          kode_pajak = '000000000';
       }

       let url = ``;
       if(statusIntegasi=='DEV'){

        // url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_disti/120/zws_sales_disti/zbn_sales_disti';  // development
         url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_disti/300/zws_sales_disti/zbn_sales_disti'; // production

           
       }else{
   
         url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_disti/300/zws_sales_disti/zbn_sales_disti'; // production
   
       }

       let usernamesoap = sails.config.globals.usernamesoap;
       let passwordsoap = sails.config.globals.passwordsoap;
       const tok = `${usernamesoap}:${passwordsoap}`;
       const hash = Base64.encode(tok);
       const Basic = 'Basic ' + hash;


       let Headers = {
        'Authorization':Basic,
        'user-agent': 'sampleTest',
        'Content-Type': 'text/xml;charset=UTF-8',
        'soapAction': 'urn:sap-com:document:sap:rfc:functions/ZWS_CMO_UPLOAD/ZFM_WS_CMORequest',
      };

       let xml = fs.readFileSync('soap/ZFM_WS_DASHDISTI.xml', 'utf-8'); // saya duplicate file 'ZFM_WS_CMO.xml' ya, dan pake yg baru saya buat itu sebagai template
       let hasil = racikXML(xml,kode_pajak, start_date,end_date);      
       //console.log(kode_pajak);
       //console.log(hasil);
  
       let { response } = await soapRequest({ url: url, headers: Headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
       let {body, statusCode } = response;


       if(statusCode==200){

        xml2js.parseString(body, async function (err, result) {


          let item = result['soap-env:Envelope']['soap-env:Body'][0]['n0:ZFM_WS_DASHDISTIResponse'][0].ITAB[0].item;
          let data = transformItem(item);

          if (data == null) {
            return res.error(err);
          }
          // console.log(data);

          let amountso = 0;
          let amountdo = 0;
          let invoice_sudah_ditagih = 0;
          let invoice_sudah_bayar = 0;
          let invoice_belum_bayar = 0;

          let nomor_so = [];
          let nomor_do = [];
          let objdata = [];
          let objdataso = [];
          let objdatainvoicesudahdibayar = [];

          for (let i = 0; i < data.length; i++) { 

            nomor_so.push({
              nomor_so:data[i].VBELN
            });

            nomor_do.push({
              nomor_do:data[i].VBEL1
            });


            if(data[i].HARGA > 0){
              objdata.push({
                nomor_so:data[i].VBELN,
                nomor_do:data[i].VBEL1,
                value_do:data[i].HARGA
              })
            }

  
            if(data[i].NETPR > 0 && data[i].VBEL1){
                objdataso.push({
                  nomor_so:data[i].VBELN,
                  nomor_do:data[i].VBEL1,
                  value_do:data[i].NETPR
                })
            }


            if(data[i].AUGBL==''){
              let invoiced = data[i].HARGA ? Number(data[i].HARGA) * 100 : 0;
              invoice_belum_bayar = invoice_belum_bayar + invoiced;
            }else{

              let invoiced_payment = data[i].HARGA ? Number(data[i].HARGA) * 100 : 0;
              invoice_sudah_bayar = invoice_sudah_bayar + invoiced_payment;

              objdatainvoicesudahdibayar.push({
                nomor_so:data[i].VBELN,
                nomor_do:data[i].VBEL1,
                value_do:data[i].HARGA
              })

            }

            
            let saleOrder = data[i].NETPR > 0 && data[i].VBEL1 ? Number(data[i].NETPR) * 100 : 0;
            let deliveryOrder = data[i].HARGA > 0 && data[i].VBEL1 ? Number(data[i].HARGA) * 100 : 0;


            invoice_sudah_ditagih = invoice_sudah_ditagih + deliveryOrder;


            amountso = amountso + saleOrder;
            amountdo = amountdo + deliveryOrder;

            
          }




          //console.log(amountso);


          let solist = nomor_so.map(function (item) {
            return item['nomor_so'];
          });

          solist = _.uniq(solist);

          //console.log(solist);

          let dolist = nomor_do.map(function (item) {
            return item['nomor_do'];
          });


          dolist = _.uniq(dolist);


          let solist_arr = "";
          for (const datas of solist) {
            solist_arr += ",'" + datas + "'"
          }
          solist_arr = solist_arr.substring(1);

          let dolist_arr = "";
          for (const datas of dolist) {
            dolist_arr += ",'" + datas + "'"
          }
          dolist_arr = dolist_arr.substring(1);



          // let sqlGetStatusDelivery = `SELECT nomor_so,nomor_do 
          // FROM delivery_order WHERE nomor_so IN(${solist_arr})
          // AND nomor_do IN(${dolist_arr})
          // AND kode_status IN('WT1','DOD','SGE','OTW','PIC','SGL') AND isactive='Y'`;


          let sqlGetStatusDelivery = `SELECT nomor_so,nomor_do 
          FROM delivery_order WHERE nomor_so IN(${solist_arr})
          AND nomor_do IN(${dolist_arr})
          AND kode_status IN('OTW','DOD','PIC') AND isactive='Y'
          AND m_distributor_id IN(
            SELECT m_distributor_id FROM m_distributor_v mdv where kode_pajak = '${kode_distributor}'
          )
          `;

          let dataStatusDelivery = await requestprod.query(sqlGetStatusDelivery);
          let statusDelivery = dataStatusDelivery.recordset;


          const hasil = objdata.filter(x => 
            (_.some(statusDelivery, { nomor_so: x.nomor_so, nomor_do: x.nomor_do }))
            )

            //console.log(hasil);
           


          let amounotw = 0;
          for (let i = 0; i < hasil.length; i++) {
            const deliveryOrder = Number(hasil[i].value_do) * 100;
            amounotw = amounotw + deliveryOrder;
            
          }

          let sqlGetStatusDeliverySudahTerkirim = `SELECT nomor_so,nomor_do 
          FROM delivery_order WHERE nomor_so IN(${solist_arr})
          AND nomor_do IN(${dolist_arr})
          AND kode_status IN('PODDIST','PODLOG','PODTRANS','FNS','SPL')
          AND isactive='Y'
          AND m_distributor_id IN(
            SELECT m_distributor_id FROM m_distributor_v mdv where kode_pajak = '${kode_distributor}'
          )`;

          //console.log(sqlGetStatusDeliverySudahTerkirim);


          //AND kode_status IN('PODDIST','PODLOG','PODTRANS','FNS','SPL') AND isactive='Y'
          //console.log(sqlGetStatusDeliverySudahTerkirim);

          let dataStatusDeliveryTerkirim = await requestprod.query(sqlGetStatusDeliverySudahTerkirim);
          let statusDeliveryTerkirim = dataStatusDeliveryTerkirim.recordset;


            // ini skrip mencari kesamaan
          const hasilSudahDiterima = objdata.filter(x => 
            (_.some(statusDeliveryTerkirim, { nomor_so: x.nomor_so, nomor_do: x.nomor_do }))
            );


          // ini mencari data no in dari data diatas atau kebalikan logicnya
          const hasilBelumDiterima = objdata.filter(x => 
            (!_.some(statusDeliveryTerkirim, { nomor_so: x.nomor_so, nomor_do: x.nomor_do }))
          );


            let amountpod = 0;
            for (let i = 0; i < hasilSudahDiterima.length; i++) {
              let deliveryOrderDiterima = Number(hasilSudahDiterima[i].value_do) * 100;
              amountpod = amountpod + deliveryOrderDiterima;
              
            }



       
  
  

            // console.log(hasil);

            // let detailOustading = objdata.filter(x => 
            //   (_.(statusDeliveryTerkirim, { nomor_so: x.nomor_so, nomor_do: x.nomor_do }))
            //   );
    

          //field yg akan di group by
          const groupByField = ['nomor_so', 'nomor_do'];
          //field yg bertipe sum
          const sumField = ['value_do']; 
          //Fungsi GroupByAndSum di bawah berada di file terpisah agar menjadi library
          const hasilSumDataSo = await groupByAndSum(objdataso, groupByField, sumField);
          const hasilSumOtw = await groupByAndSum(hasil, groupByField, sumField);
          const hasilSumDataSudahDiterima= await groupByAndSum(hasilSudahDiterima, groupByField, sumField);
          const hasilSumDataInvoiceSudahDitagih= await groupByAndSum(objdata, groupByField, sumField);
          const hasilSumDataInvoiceSudahDibayar= await groupByAndSum(objdatainvoicesudahdibayar, groupByField, sumField);

          let total_so = amountso;
          let total_nilai_sedang_dikirim = amounotw ;
          let total_nilai_sudah_diterima = amountpod;

          //Merge B + C
          const BC = Object.values([...hasilSumOtw, ...hasilSumDataSudahDiterima].reduce((bc, { nomor_so, nomor_do,
            value_do }) => {
              bc[nomor_so] = { nomor_so,nomor_do, value_do: (bc[nomor_so] ? bc[nomor_so].value_do : 0) + value_do  };
              return bc;
          }, {}));


          const AminBC = Object.values([...hasilSumDataSo, ...BC].reduce((aminbc, { nomor_so, nomor_do,
            value_do }) => {
              
              const tempValDO = (aminbc[nomor_so] ? aminbc[nomor_so].value_do * -1 : 0) + value_do
              
              const tempObj = { nomor_so,nomor_do, value_do: tempValDO };
              
              if (tempValDO === 0) {
                aminbc[nomor_so] = null
              } else {
                aminbc[nomor_so] = tempObj;
              }
              
              return aminbc;
            }, {})).filter(n => n); 




            let hasilOutstanding = [];
            for (let i = 0; i < AminBC.length; i++) {

              hasilOutstanding.push({
                nomor_so:AminBC[i].nomor_so,
                nomor_do:AminBC[i].nomor_do,
                value_do:Number(AminBC[i].value_do).toFixed(2)
              })

              
            }


            console.log(hasilOutstanding);



          //console.log(hasilSumDataSudahDiterima);
          // console.log(total_nilai_sedang_dikirim);
          // console.log(total_nilai_sudah_diterima);
          let total_outstanding_so = total_so - (total_nilai_sedang_dikirim + total_nilai_sudah_diterima);

          //console.log(hasilBelumDiterima);

          let obj = {
            total_so : {
              value:total_so,
              url:'/distributor/cmo',
              data:hasilSumDataSo
            },
            total_nilai_sedang_dikirim : {
              value:total_nilai_sedang_dikirim,
              url:'/distributor/tracking-do-driver',
              data:hasilSumOtw
            },
            total_nilai_sudah_diterima : {
              value:total_nilai_sudah_diterima,
              url:'/distributor/tracking-do-driver',
              data:hasilSumDataSudahDiterima
            },
            total_outstanding_so : {
              value:Math.abs(total_outstanding_so),
              url:'/distributor/cmo',
              data:hasilOutstanding,
            },
            invoice_sudah_ditagih : {
              value:invoice_sudah_ditagih,
              url:'/distributor/klaim-proposal',
              data:hasilSumDataInvoiceSudahDitagih
            },
            invoice_sudah_bayar : {
              value:invoice_sudah_bayar,
              url:'/distributor/klaim-proposal',
              data:hasilSumDataInvoiceSudahDibayar
            },
            invoice_belum_bayar : {
              value:invoice_belum_bayar,
              url:'/distributor/klaim-proposal'
            }
          }
          //console.log(obj);

          return res.success({
            result:obj,
            message: "Fetch data successfully"
           });
      
        });
       }else{

        let obj = {
          total_so : 0,
          total_nilai_sedang_dikirim : 0,
          total_nilai_sudah_diterima : 0,
          total_outstanding_so : 0,
          invoice_sudah_ditagih : 0,
          invoice_sudah_bayar : 0,
          invoice_belum_bayar : 0
        }

        return res.success({
          result:obj,
          message: "Fetch data successfully"
         });
       
        }

     } catch (err) {
       return res.error(err);
     }
   },
 };
 


 async function groupByAndSum(arr, groupByField, sumField) {
  //variable di bawah (grsumbyhasil) di gunakan sebagai penampung sumber data dan akan menjadi variable hasil (result) juga
  let grsumbyhasil = arr;
  // Logic Group by and SUM dimulai, hasil akan di timpa ke grsumbyhasil
  groupByField.forEach(gb => {
    grsumbyhasil = _(grsumbyhasil)
    .groupBy(gb) 
    .map((groupedData, id) => { 
      let fieldToSum = {}
      sumField.forEach(xy => { 
        fieldToSum[xy] = _.sumBy(groupedData, o=> Number(o[xy]))
      }) 
      
      let modifiedObject = {
        ...groupedData[0],
        ...fieldToSum 
      } 
      return modifiedObject
    })
    .value()
  })
    return grsumbyhasil
  }

async function getFkByJenis(kode_distributor,start_date,end_date,eksekusi){

  await DB.poolConnect;
     
  try {
    const request = DBPROD.pool.request();

     let sqlCheckPajak = `SELECT * FROM m_pajak WHERE kode = '${kode_distributor}'`;
     let dataSoldto = await request.query(sqlCheckPajak);
     let statusSoldto = dataSoldto.recordset;

     //console.log(statusSoldto);


     let sqlCheckDistributor = `SELECT * FROM m_distributor_v WHERE kode = '${kode_distributor}'`;
     //console.log(sqlCheckDistributor);
     let dataShipto = await request.query(sqlCheckDistributor);
     let statusShipto = dataShipto.recordset;

     let whereLevelPajak = ``;
     if(statusSoldto.length > 0){
         whereLevelPajak = `AND m_pajak_id = '${statusSoldto[0].m_pajak_id}'`;
     }


     let whereLevelDistributor = ``;
     if(statusShipto.length > 0){
         whereLevelDistributor = `AND m_distributor_id = '${statusShipto[0].m_distributor_id}'`;
     }

     

     let queryDataTableFkrRecallDr = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'DRAFT'`;


     //console.log(queryDataTableFkrRecallDr);

     let getdataRecallDr = await request.query(queryDataTableFkrRecallDr);
     let recallDr = getdataRecallDr.recordset[0].amount;



     let queryDataTableFkrRecallApa = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'APA'`;

     let getdataRecallApa = await request.query(queryDataTableFkrRecallApa);
     let recallApa = getdataRecallApa.recordset[0].amount;


     let queryDataTableFkrRecallApr = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'APR'`;

     let getdataRecallApr = await request.query(queryDataTableFkrRecallApr);
     let recallApr = getdataRecallApr.recordset[0].amount;


     let queryDataTableFkrRecallWt1 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT1'`;

     let getdataRecallWt1 = await request.query(queryDataTableFkrRecallWt1);
     let recallWt1 = getdataRecallWt1.recordset[0].amount;

     let queryDataTableFkrRecallWt2 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT2'`;

     let getdataRecallWt2 = await request.query(queryDataTableFkrRecallWt2);
     let recallWt2 = getdataRecallWt2.recordset[0].amount;


     let queryDataTableFkrRecallWt3 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT3'`;

     let getdataRecallWt3 = await request.query(queryDataTableFkrRecallWt3);
     let recallWt3 = getdataRecallWt3.recordset[0].amount;

     let queryDataTableFkrRecallWt4 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT4'`;

     let getdataRecallWt4 = await request.query(queryDataTableFkrRecallWt4);
     let recallWt4 = getdataRecallWt4.recordset[0].amount;

     let queryDataTableFkrRecallWt5 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT5'`;

     let getdataRecallWt5 = await request.query(queryDataTableFkrRecallWt5);
     let recallWt5 = getdataRecallWt5.recordset[0].amount;

     let queryDataTableFkrRecallWt6 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT6'`;

     let getdataRecallWt6 = await request.query(queryDataTableFkrRecallWt6);
     let recallWt6 = getdataRecallWt6.recordset[0].amount;

     let queryDataTableFkrRecallWt7 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT7'`;

     let getdataRecallWt7 = await request.query(queryDataTableFkrRecallWt7);
     let recallWt7 = getdataRecallWt7.recordset[0].amount;

     let queryDataTableFkrRecallWt8 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT8'`;

     let getdataRecallWt8 = await request.query(queryDataTableFkrRecallWt8);
     let recallWt8 = getdataRecallWt8.recordset[0].amount;

     let queryDataTableFkrRecallWt9 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT9'`;

     let getdataRecallWt9 = await request.query(queryDataTableFkrRecallWt9);
     let recallWt9 = getdataRecallWt9.recordset[0].amount;

     let queryDataTableFkrRecallWt10 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.kode_status = 'WT10'`;

     //console.log(queryDataTableFkrRecallWt10);

     let getdataRecallWt10 = await request.query(queryDataTableFkrRecallWt10);
     let recallWt10 = getdataRecallWt10.recordset[0].amount;

     let queryDataTableFkrRecallWt11 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.created BETWEEN '${start_date}' AND '${end_date}'
     AND f.kode_status = 'WT11'`;

     let getdataRecallWt11 = await request.query(queryDataTableFkrRecallWt11);
     let recallWt11 = getdataRecallWt11.recordset[0].amount;

     let queryDataTableFkrRecallWt12 = `SELECT COALESCE(SUM(amount),0) AS amount FROM fkr_v f WHERE 
     f.isactive = 'Y' ${whereLevelPajak} ${whereLevelDistributor}
     AND f.eksekusi = '${eksekusi}'
     AND f.kode_status <> 'RJC'
     AND f.created BETWEEN '${start_date}' AND '${end_date}'
     AND f.kode_status = 'WT12'`;

     let getdataRecallWt12 = await request.query(queryDataTableFkrRecallWt12);
     let recallWt12 = getdataRecallWt12.recordset[0].amount;

     let total = recallDr + recallApa + recallApr + recallWt1 + recallWt2 + recallWt3 + recallWt4 + recallWt5 + 
     recallWt6 + recallWt7 + recallWt8 + recallWt9 + recallWt10 + recallWt11 + recallWt12;


     let obj = {
         DR:{
           value : recallDr,
           url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=DRAFT`
         },
         APA:{
          value : recallApa,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=APA`
         },
         APR:{
          value : recallApr,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=APR`
         },
         WT1:{
          value : recallWt1,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT1`
         },
         WT2:{
          value : recallWt2,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT2`
         },
         WT3:{
          value : recallWt3,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT3`
         },
         WT4:{
          value : recallWt4,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT4`
         },
         WT5:{
          value : recallWt5,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT5`
         },
         WT6:{
          value : recallWt6,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT6`
         },
         WT7:{
          value : recallWt7,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT7`
         },
         WT8:{
          value : recallWt8,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT8`
         },
         WT9:{
          value : recallWt9,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT9`
         },
         WT10:{
          value : recallWt10,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT10`
         },
         WT11:{
          value : recallWt11,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT11`
         },
         WT12:{
          value : recallWt12,
          url:`/distributor/fkr-barang?jenis_eksekusi=${eksekusi}&kode_status=WT12`
         },
         TOTAL:total
     }

     return obj;
           

  } catch (err) {
    return res.error(err);
  }
}

function transformItem(item){

  if (item && Array.isArray(item))  {
    //logic sekarang

    for (let i = 0; i < item.length; i++) {

      item[i].VBELN = item[i].VBELN[0];
      item[i].KUNNR = item[i].KUNNR[0];
      item[i].KUNN1 = item[i].KUNN1[0];
      item[i].POSNR = item[i].POSNR[0];
      item[i].BSTNK = item[i].BSTNK[0];
      item[i].VDATU = item[i].VDATU[0];
      item[i].AUDAT = item[i].AUDAT[0];
      item[i].MATNR = item[i].MATNR[0];
      item[i].ARKTX = item[i].ARKTX[0];
      item[i].KWMENG = item[i].KWMENG[0];
      item[i].NETPR = item[i].NETPR[0];
      item[i].VRKME = item[i].VRKME[0];
      item[i].VBEL1 = item[i].VBEL1[0];
      item[i].CHARG = item[i].CHARG[0];
      item[i].LFIMG = item[i].LFIMG[0];
      item[i].HARGA = item[i].HARGA[0];
      item[i].VBEL2 = item[i].VBEL2[0];
      item[i].AUGBL = item[i].AUGBL[0];
      item[i].AUGDT = item[i].AUGDT[0];
      item[i].WAERS = item[i].WAERS[0];
      
    }
    
   }

  return item;

}

 function racikXML(xmlTemplate,kode_pajak,start_date,end_date) {

  let dataxml = xmlTemplate;
  if(kode_pajak){
    dataxml = xmlTemplate.replace('?', kode_pajak);
  }


  if(start_date){
    dataxml = dataxml.replace('start_date', start_date);
  }


  if(end_date){
    dataxml = dataxml.replace('end_date', end_date);
  }


  return dataxml;
}