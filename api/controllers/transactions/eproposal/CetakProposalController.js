/* eslint-disable no-console */
/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const path = require('path');
const moment = require('moment');
const glob = require('glob');
const json2xls = require('json2xls');
const axios = require("axios");
const numeral = require('numeral');
const puppeteer = require('puppeteer')
const handlebars = require("handlebars");
const { words } = require("lodash");
const { format } = require("path");
const _ = require('lodash');
const DBPROP = require("../../../services/DBPROPOSAL");
const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'eprop');

module.exports = {

  cetak: async function(req, res) { 
    const {
        query: {m_user_id,employee_id,nama}
      } = req;
    try {
      const request = await DBPROP.promise();
      console.log('m_user_id ',m_user_id);
      console.log('employee_id ',employee_id);
      console.log('nama ',nama);
       
      let queryDataTable = `SELECT
      p.status_id,
      p.user_id,
      p.proposal_id,
      p.doc_no AS proposal_no,ms.status_name AS status,
      p.budget_year,p.title,p.proposal_date,
      p.start_date AS period_start,
      p.end_date AS period_end,
      p.division_code AS division,
      p.region_id,
      p.month_proposal,
      p.division_code,
      p.company_code,
      mdv.division_id,
      mc.company_id,
      mr.region_desc AS region,
      p.total_budget,
      p.total_budget AS budget,
      p.sales_target,
      p.avg_sales AS avarage_sales,
      p.mechanism,
      p.kpi,
      p.objective,
      p.background,
      p.start_date,
      p.end_date,
      p.avg_sales,
      p.sales_target,
      p.created_by,
      p.referensi_no,
      p.brand_text
      FROM proposal p
      LEFT JOIN m_status ms ON p.status_id = ms.status_id
      LEFT JOIN m_region mr ON mr.region_id = p.region_id
      LEFT JOIN m_company mc ON mc.company_code = p.company_code
      LEFT JOIN m_division mdv ON mdv.division_code = p.division_code and p.company_code = mdv.company_desc
      WHERE p.proposal_id = '${req.param(
        "id"
      )}'`;

      console.log("CEK QUERY ",queryDataTable);    
      let [rows, fields] = await request.query(queryDataTable);
    
      let row = rows[0];

      console.log(row);
      let printby = row.created_by;
      let company_id = row.company_id;
      let tahun = row.budget_year;
      let division_code = row.division_code;
      row.mechanism = row.mechanism.replace('*\r','');


      let sqlgetApproval = `SELECT updated_date FROM proposal_approval WHERE proposal_id  = ${req.param(
        "id"
      )} AND status_approval_id = 2 AND flag = 2 ORDER BY updated_date desc limit 1`;

      let dataapproval = await request.query(sqlgetApproval);
      let dateapproval = dataapproval[0][0].updated_date;

      

      let sqlgetexecutor = `SELECT * FROM proposal_executor LEFT JOIN employee ON proposal_executor.employee_id = employee.id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataexecutor = await request.query(sqlgetexecutor);
      let executor = dataexecutor[0];
      console.log("cek >",executor);


      let sqlgetdistributor = `SELECT *,nama_distributor AS name FROM proposal_distributor LEFT JOIN distributor ON proposal_distributor.distributor_id = distributor.distributor_id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let datadistributor = await request.query(sqlgetdistributor);
      let distributor = datadistributor[0];

      let sqlgetemaildistributor = `SELECT * FROM proposal_email_distributor WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataemaildistributor = await request.query(sqlgetemaildistributor);
      let emaildistributor = dataemaildistributor[0];
      
      let emaildist = emaildistributor.map(function (item) {
          return item['email_distributor'];
      });
            
      let sqlgetmarkettype= `SELECT pm.proposal_market_id,mmt.* FROM proposal_market pm 
      LEFT JOIN m_market_type mmt ON(pm.market_type_id = mmt.market_type_code)
      WHERE pm.proposal_id = '${req.param(
        "id"
      )}'`;

      let datamarketype = await request.query(sqlgetmarkettype);
      let markettype = datamarketype[0];



      let sqlgetapprovalprogress = `SELECT * FROM v_appr_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY no_appr ASC`;
      let dataapprovalprogress = await request.query(sqlgetapprovalprogress);
      let approvalprogress = dataapprovalprogress[0];
      let tanggalapptove = dataapprovalprogress[0].created_date;
      console.log("isian >",dataapprovalprogress[0]);


      let budget_year = tahun;
      let active = 0;
      let companyfilter = ``;
      if(budget_year==2020){
        active = 0;
        companyfilter = `AND activity.company_id='${company_id}'`
      }else{
        active = 1;
      }


      let sqlgetbudget = `SELECT 
      pb.proposal_budget_id,
      activity.division,
      mbch.branch_code,
      mbch.branch_desc AS branch,
      CONCAT(activity.activity_code,' - ',activity.activity_desc) AS activity,
      case WHEN pb.nilai_so > 0 
      THEN pb.nilai_so else pb.budget end as budget,
      activity.activity_code,
      mb.brand_code,
      mb.brand_code AS brand,
      pb.nilai_so,
      case
        when pb.bulan = 1 then 'Januari'
        when pb.bulan = 2 then 'Februari'
        when pb.bulan = 3 then 'Maret'
        when pb.bulan = 4 then 'April'
        when pb.bulan = 5 then 'Mei'
        when pb.bulan = 6 then 'Juni'
        when pb.bulan = 7 then 'Juli'
        when pb.bulan = 8 then 'Agustus'
        when pb.bulan = 9 then 'September'
        when pb.bulan = 10 then 'Oktober'
        when pb.bulan = 11 then 'November'
        when pb.bulan = 12 then 'Desember'
        else 'Invalid Month'
    	end AS bulan_desc
      FROM proposal_budget pb
      LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id AND activity.year = '${budget_year}'
      LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
      LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
      LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id  
      WHERE pb.proposal_id = '${req.param(
        "id"
      )}'
      AND activity.active = ${active}
      ${companyfilter}
      `;

      //console.log(sqlgetbudget);

      let databudget = await request.query(sqlgetbudget);
      let budget = databudget[0];

      let datavariant = [];
      for (let i = 0; i < budget.length; i++) {

        let activity_code = budget[i].activity_code;
        let brand_code = budget[i].brand_code;
        // let budget_year = tahun;
        budget[i].division = division_code;
        budget[i].division_code = division_code;

        //console.log('budget_year ',budget_year);
        // if(budget_year==2020){
        //   active = 0;
        //   companyfilter = `AND activity.company_id=${company_id}`
        // }else{
        //   active = 1;
        // }

        let sqlgetbudgetactivity = `SELECT SUM(budget) as total,m_group.group_name,m_brand.brand_desc 
				FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
				LEFT JOIN m_group ON budget.group_id = m_group.id_group 
        LEFT JOIN m_activity activity ON m_group.id_group = activity.group_id AND activity.active=${active} AND activity.year = '${budget_year}'
        WHERE activity.activity_code = '${activity_code}' 
        ${companyfilter}
        AND budget.year = '${budget_year}' AND budget.brand_code = '${brand_code}'`;
        // console.log(sqlgetbudgetactivity);
        let databudgetactivity = await request.query(sqlgetbudgetactivity);
        let budgetactivity = Number(databudgetactivity[0][0].total);

        


        let sqlgetbudgetperactivity = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
        INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
        LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.active=${active} AND activity.year = '${budget_year}'
        WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}' 
        AND proposal.status_id = 30
        ${companyfilter}
        AND activity.group_id = (SELECT group_id FROM m_activity activity WHERE activity_code = '${activity_code}' 
        AND activity.year = '${budget_year}' AND active=${active} ${companyfilter})`;
        //console.log(sqlgetbudgetperactivity);
        let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
        let budgetperactivity = Number(databudgetperactivity[0][0].total);


        let budget_act = budgetactivity - budgetperactivity;


        let sqlgetbudgetbrand = `SELECT SUM(budget) as total,m_brand.brand_desc 
        FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code  WHERE budget.year = '${budget_year}' AND budget.brand_code = '${brand_code}'`;

        let databudgetbrand = await request.query(sqlgetbudgetbrand);
        let budgetbrand = Number(databudgetbrand[0][0].total);



        let sqlgetbudgetperbrand = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
        INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id
        where brand_code = '${brand_code}' and budget_year = '${budget_year}' and 
        proposal.status_id=30 and proposal.budget_year='${budget_year}'`;

        // console.log(sqlgetbudgetperbrand);


        let databudgetperbrand = await request.query(sqlgetbudgetperbrand);
        let budgetperbrand = Number(databudgetperbrand[0][0].total);

        let budget_brand = budgetbrand - budgetperbrand;

        budget[i].budgetactivity = budget_act;
        budget[i].budgetbrand = budget_brand;
        budget[i].budgettoapprove = numeral(budget[i].budget).format("0,0");

        let proposal_budget_id = budget[i].proposal_budget_id;
        let sqlproposalbudgetvariant = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
        pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
        FROM proposal_budget_variant pbv 
        LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
        WHERE pbv.proposal_budget_id = '${proposal_budget_id}'`;
        //console.log(sqlproposalbudgetvariant);

        let dataproposalbudgetvariant = await request.query(sqlproposalbudgetvariant);
        let proposalbudgetvariant = dataproposalbudgetvariant[0];
        datavariant.push(proposalbudgetvariant[0])
        budget[i].variant = proposalbudgetvariant;

        delete budget[i].budget;

      }


      let sqlgetsku = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
      pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
      FROM proposal_budget_variant pbv
      LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
      WHERE pbv.proposal_id = '${req.param(
        "id"
      )}'`;


      
      let datasku= await request.query(sqlgetsku);
      let sku = datasku[0];
       
    //   let sku = _.uniqBy(datavariant,"variant_id");

      let sqlgethistory = `SELECT * FROM v_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY created_date DESC`;

      let datahistory = await request.query(sqlgethistory);
      let history = datahistory[0];

      let sqlgetfile = `SELECT proposal_file_id AS uid,file AS name,'done' AS status FROM proposal_file WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      
      let sqlgetStatusApprovalByEmployeeId = `SELECT status_approval_id,proposal_approval_id, updated_date FROM proposal_approval WHERE proposal_id = '${req.param(
        "id"
      )}' AND employee_id = '${employee_id}'`;
      
      let status_approval_id = undefined;
      let proposal_approval_id = undefined;
      let updated_date = undefined;
      if(employee_id){

        let dataapprovalemployee = await request.query(sqlgetStatusApprovalByEmployeeId);
        let approvalemployee = dataapprovalemployee[0];
        status_approval_id = approvalemployee.length > 0 ? approvalemployee[0].status_approval_id : 0;
        proposal_approval_id = approvalemployee.length > 0 ? approvalemployee[0].proposal_approval_id : null;
        updated_date = approvalemployee.length > 0 ? approvalemployee[0].updated_date : null;
      }

      row.status_approval_id = status_approval_id;
      row.proposal_approval_id = proposal_approval_id;
      row.updated_by = updated_date;
      let datafile = await request.query(sqlgetfile);
      let file = datafile[0];


        for (let i = 0; i < distributor.length; i++) {
          
          let no = i + 1;
          distributor[i].no = no;
          
        }

        for (let i = 0; i < budget.length; i++) {
          
          let no = i + 1;
          budget[i].no = no;
          
        }

        for (let i = 0; i < history.length; i++) {
          
          let no = i + 1;
          history[i].no = no;
          
        }

        for (let i = 0; i < approvalprogress.length; i++) {
          

          approvalprogress[i].created_date = moment(approvalprogress[i].created_date,'YYYY-MM-DD').format('YYYY-MM-DD');
          let no = i + 1;
          approvalprogress[i].no = no;

          if(approvalprogress[i].flag == 0){
            approvalprogress[i].status = "Menunggu";
          }else if(approvalprogress[i].flag == 1){
            approvalprogress[i].status = "Sedang Diproses";
          }else{
            approvalprogress[i].status = "Selesai";
          }
          approvalprogress[i].comment = approvalprogress[i].comment ? approvalprogress[i].comment : '';
          // approvalprogress[i].created_date = approvalprogress[i].created_date ? approvalprogress[i].created_date : '';
          approvalprogress[i].created_date = approvalprogress[i].created_date;
          
          console.log("BIKIN TANGGAL >",approvalprogress[i].created_date);
          
        }


        let arraysku = [];
        for (let i = 0; i < sku.length; i++) {
          
          let no = i + 1;
          sku[i].no = no;
          let brand_code = sku[i].brand_code;
          let package_type = sku[i].package_type;
          
          let datasku = brand_code +' '+package_type ? package_type : '';
          arraysku.push(datasku)
          
        }

        let arrayBranch = [];
        let arrayBranchOriginal = [];
        for (let i = 0; i < budget.length; i++) {
          
          let no = i + 1;
          arrayBranch.push(no+'.'+budget[i].branch)
          arrayBranchOriginal.push(budget[i].branch)
        }
        


        for (let i = 0; i < sku.length; i++) {
          
          let no = i + 1;
          sku[i].no = no;
 
          
        }


        for (let i = 0; i < file.length; i++) {

          let proposal_id = file[i].proposal_id;
          let no = i + 1;
          file[i].no = no;
          file[i].url = "";
          
        }
        let arrayExecutor = [];
        for (let i = 0; i < executor.length; i++) {

            arrayExecutor.push(executor[i].name)
            console.log("lokit 2",executor[i].name);
        }

  
        let arrayDistributor = [];
        for (let i = 0; i < distributor.length; i++) {

            arrayDistributor.push(distributor[i].name)
        }


       let branchUnique = _.uniq(arrayBranchOriginal);


       //console.log(branchUnique);

        const executorlist = arrayExecutor.join(' \n');
        const branchlist = arrayBranch.join(' \n');
        const distributorlist = arrayDistributor.join(' \n');
        let tableprogress = _generateTableProgress(approvalprogress);
        console.log("mmmm >",approvalprogress);
        let tablebudget = _generateTableBudget(budget);
        //console.log(tablebudget);


        let tablestatus = row.status_id == 0 ?  '<h4> Proposal Ini Masih dalam draft </h4>' : `
        <table class="table table-bordered" border=1 cellspacing="-1" cellpadding="2" width="100%">
        <tr>
            <td colspan="7" style="background-color: black" >  
                    <span style="color: white"> Approval Progress  </span>
            </td>
        </tr>
        <tr class="sansserif">
            <th> No </th>
            <th> Approval</th>
            <th> Position</th>
            <th> Status </th>
            <th> Approval </th>
            <th> Comment </th>
            <th> Tanggal </th>
        </tr>
        ${tableprogress}
    </table>`
    console.log("masukluhh ",tableprogress);

        arraysku = [...new Set(arraysku)];
        emaildist = [...new Set(emaildist)];
        row.sku = arraysku.toString();
        row.variant = sku;
        row.executor = executor;
        row.distributor = distributor;
        row.emaildistributor = emaildist.toString();
        row.approvalprogress = approvalprogress;
        row.budget = budget;
        row.history = history;
        row.file = file;
        row.markettype = markettype;
        // row.nama = nama;
        row.dateapproval = moment(dateapproval,'YYYY-MM-DD').format('YYYY-MM-DD');
        row.nama = printby;
        row.branchlist = branchlist;
        row.executorlist = executorlist;
        row.distributorlist = distributorlist;
        row.now = moment().format('YYYY-MM-DD hh:mm:ss');
        row.tableprogress = tablestatus;
        row.tablebudget = tablebudget;
        row.baseurl = direktoricetak();


        let divisionandcompany = row.division_code ? row.division_code : row.company_code;
        
        let heightmargin = (budget.length + approvalprogress.length) * 10;
        let markettypeHtmllist = '';
        for (const detail of markettype) {
            markettypeHtmllist += 
            `${detail.market_type_desc}`    
        }

        row.markettypeHtmllist = markettypeHtmllist;
        let proposal_date = moment(row.proposal_date,'YYYY-MM-DD').format('DD-MMM-YYYY');
        let rangedate = moment(row.period_start,'YYYY-MM-DD').format('DD-MMM-YYYY') + ' s/d ' +moment(row.period_end,'YYYY-MM-DD').format('DD-MMM-YYYY')
        row.rangedate = rangedate;
        row.proposal_date = proposal_date;
        row.divisionandcompany = divisionandcompany;
    
        let logo = `data:image/jpeg;base64,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`;



        let paramHtml = {
            
            baseurl:direktoricetak(),
            logo:logo,
            referensi_no:row.referensi_no ? row.referensi_no : '', 
            title:row.title,
            rangedate:row.rangedate,
            proposal_no:row.proposal_no,
            company_code:row.company_code,
            proposal_date:row.proposal_date,
            budget_year:row.budget_year,
            markettypeHtmllist:row.markettypeHtmllist,
            nama:row.nama,
            totalbudget:row.total_budget,
            divisionandcompany:row.divisionandcompany,
            region:row.region,
            branch:branchUnique,
            branchlist:row.branchlist,
            brand_text:row.brand_text,
            dateapproval:row.dateapproval,
            sku:row.sku,
            executorlist:row.executorlist,
            distributorlist:row.distributorlist,
            now:row.now,
            status:row.status,
            background:row.background,
            mechanism:row.mechanism,
            objective:row.objective,
            kpi:row.kpi,
            tablebudget:row.tablebudget,
            tableprogress:row.tableprogress

  
        }

        //console.log(paramHtml.mechanism.trim());


          let finalHtml = await sails.helpers.generateHtmlCetakEprop.with({ htmltemplate: 'index', templateparam: paramHtml}); 
          const browser = await puppeteer.launch({ headless: true })
          const page = await browser.newPage();
          await page.setContent(finalHtml);
          // eslint-disable-next-line no-undef
          let height = await page.evaluate(() => document.documentElement.offsetHeight);
          let width = await page.evaluate(() => document.documentElement.offsetWidth);
          const buffer = await page.pdf({
            height: `${height+heightmargin}px`,
            // printBackground: true,
            format:'A4',
            printBackground: true,
            landscape:false,
            
        })
        await browser.close();
        res.contentType(`application/pdf`);
        res.send(buffer);
    } catch (err) {
      console.log(err);
      return res.error(err);
    }

},





  getexportExcel: async function(req, res) {
    const {
      query: {m_user_id,fkr_id,periode,m_distributor_id,eksekusi}
    } = req;

    //console.log(req.query);
    
    await DB.poolConnect;
    try {
      const request = DB.pool.request();

      let whereclausefkrid = ``;
      if(fkr_id){
        whereclausefkrid = `AND fkr_id = '${fkr_id}'`;
      }

      let whereclausemdistributorid = ``;
      if(m_distributor_id){
        whereclausemdistributorid = `AND m_distributor_id = '${m_distributor_id}'`;
      }

      let whereclauseeksekusi = ``;
      if(eksekusi){
        whereclauseeksekusi = `AND eksekusi = '${eksekusi}'`;
      }

      let whereclauseperiode = ``;
      if(periode){
        let bulan = parseInt(moment(periode,'YYYY-MM').format('MM'));
        let tahun = moment(periode,'YYYY-MM').format('YYYY');
        whereclauseperiode = `AND bulan = ${bulan} AND tahun = '${tahun}'`;
      }

      let queryDataTable = `SELECT * FROM fkr_export_excel_v WHERE 1=1 ${whereclausefkrid} ${whereclausemdistributorid} ${whereclauseeksekusi} ${whereclauseperiode} ORDER BY created`;
      

      request.query(queryDataTable, (err, result) => {
        if (err) {
          return res.error(err);
        }

        const rows = result.recordset;

        let arraydetailsforexcel = [];
        for (let i = 0; i < rows.length; i++) {

          let obj = {

            "DISTRIBUTOR" : rows[i].distributor,
            "BULAN" : rows[i].bulan, 
            "TAHUN" : rows[i].tahun,
            "NOMOR_FKR" : rows[i].nomor_fkr, 
            "NOMOR_SO" : rows[i].nomor_so, 
            "NOMOR_GI" : rows[i].nomor_gi, 
            "NOMOR_CREDIT_NOTED" : rows[i].nomor_cn, 
            "TUJUAN_RETUR" : rows[i].tujuan_retur,
            "AMOUNT" : rows[i].amount, 
            "MATERIAL" : rows[i].nama,
            "TOTAL_RETUR" : rows[i].total_retur, 
            "EXPIRED_GUDANG" : rows[i].expired_gudang, 
            "EXPIRED_TOKO" : rows[i].expired_toko, 
            "DAMAGE" : rows[i].damage, 
            "RECALL" : rows[i].recall, 
            "RETUR_ADMINISTRATIF" : rows[i].retur_administratif, 
            "RUSAK_DI_JALAN" : rows[i].rusak_di_jalan, 
            "MISSPART" : rows[i].misspart, 
            "PERALIHAN" : rows[i].peralihan, 
            "REPLACEMENT" : rows[i].repalcement, 
            "DELISTING" : rows[i].delisting,
            "JENIS_EKSEKUSI" : rows[i].eksekusi,
            "KETERANGAN" : rows[i].keterangan


          }

          arraydetailsforexcel.push(obj);

        }


        return res.success({
          result: arraydetailsforexcel,
          message: "Fetch data successfully"
        });

      });

    } catch (err) {
      return res.error(err);
    }
  },


  loadGrCn: async function(req, res) {
    // const {m_user_id,m_driver_id,nama,tgl_lahir,nomor_ktp,nomor_sim,nomor_hp} = req.body;
    await DB.poolConnect;
    try {
      const request = DB.pool.request();
      let sqlgetdatafkr = `SELECT * FROM fkr 
      WHERE (nomor_gi IS NULL OR nomor_cn IS NULL) AND status='Success Approve' AND isactive='Y'`;
    
      request.query(sqlgetdatafkr,async (err, result) => {
        if (err) {
          return res.error(err);
        }

        let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
        let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
        let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

        let datafkr = result.recordset;          
        for (let i = 0; i < datafkr.length; i++) {
      
          let url = ``;
          if(statusIntegasi=='DEV'){
            
            url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_histfkr/120/zws_sales_histfkr/zbn_sales_histfkr'; // development
      
      
          }else{
  
            url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_fkrhist/300/zws_sales_fkrhist/zbn_sales_fkrhist'; // production
      
          }

          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;
          const tok = `${usernamesoap}:${passwordsoap}`;

          const hash = Base64.encode(tok);
          const Basic = 'Basic ' + hash;
  
          
          let headers = {
            'Authorization':Basic,
            'user-agent': 'esalesSystem',
            'Content-Type': 'text/xml;charset=UTF-8',
            'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_SOFKR:ZFM_WS_SOFKRRequest',
          };
  

            let nomor_so = datafkr[i].nomor_so;
            let fkr_id = datafkr[i].fkr_id;
            let datas = [nomor_so];
            let xml = fs.readFileSync('soap/ZFM_WS_FKRHIST.xml', 'utf-8');
            let hasil = racikXMLObject(xml, datas, 'VBELN');
  
            let { response } = await soapRequest({ url: url, headers: headers,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
            let {body, statusCode } = response;
            if(statusCode==200){
              var parser = new xml2js.Parser({explicitArray : false});
              parser.parseString(body, async function (err, result) {
                if (err) {
                  return res.error(err);
                }
  
  
                const DOGR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FKRHISTResponse'].DOGR;
                const CN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FKRHISTResponse'].CN;            
  
                // console.log('DOGR ',DOGR);
                // console.log('CN ',CN);
                
                if(DOGR){
  
                  let sql = `UPDATE fkr 
                  SET updated=getdate(),
                  nomor_gi = '${DOGR}'
                  WHERE fkr_id='${fkr_id}'`;
                  await request.query(sql);
    
                }

                if(CN){
  
                  let sql = `UPDATE fkr 
                  SET updated=getdate(),
                  nomor_cn = '${CN}'
                  WHERE fkr_id='${fkr_id}'`;
                  await request.query(sql);

                }
              });
            }
        }
        return res.success({
          message: "Update data successfully"
        });
      });
    } catch (err) {
      return res.error(err);
    }
  },



}



function _generateTableProgress(table) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
        console.log("colomn >>",column);
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`

          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = ""
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr class="mono-space">`
          content = content + addRowSpan("no", i, false,"center")
          content = content + addRowSpan("name", i, false,"left")
          content = content + addRowSpan("position_appr", i, false, "left")
          content = content + addRowSpan("status_approval_desc", i, false, "left")
          content = content + addRowSpan("flag", i, false, "left")
          content = content + addRowSpan("comment", i, false, "left")
          content = content + addRowSpan("created_date", i, false, "left")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}


function _generateTableBudget(table) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`

          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = ""
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr class="mono-space">`
          content = content + addRowSpan("no", i, false,"center")
          content = content + addRowSpan("division", i, false,"left")
          content = content + addRowSpan("bulan_desc", i, false,"left")
          content = content + addRowSpan("branch", i, false, "left")
          content = content + addRowSpan("brand", i, false, "left")
          content = content + addRowSpan("activity", i, false, "left")
          content = content + addRowSpan("budgettoapprove", i, false, "right")
          content = content + `</tr>`
      }

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}



