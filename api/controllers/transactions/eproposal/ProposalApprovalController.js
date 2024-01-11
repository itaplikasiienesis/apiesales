const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const Base64 = require('base-64');
const fs = require('fs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../services/DBPROPOSAL");
const SendEmail = require('../../../services/SendEmail');
const SendEmailExecutor = require('../../../services/SendEmailExecutor');
const SendEmailCreatedBy = require('../../../services/SendEmailCreatedBy');
const SendEmailAll = require('../../../services/SendEmailAll');
const path = require('path');
const SendEmailApproval = require('../../../services/SendEmailApproval');
const shell = require('shelljs');

const budgetTidakCukupHtml = path.join(sails.config.appPath, 'assets', 'budgettidakcukup.html'); //html approve sukses
const approveHtml = path.join(sails.config.appPath, 'assets', 'successapprove.html'); //html approve sukses
const rejectHtml = path.join(sails.config.appPath, 'assets', 'successreject.html'); //html reject sukses
const alreadyHtml = path.join(sails.config.appPath, 'assets', 'alreadyaprj.html'); //html proposal sudah dilakukan
const baseurl = () => path.resolve(sails.config.appPath);
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
var HTMLParser = require('node-html-parser');

module.exports = {


  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage,searchText, pageSize,employee_id,type }
    } = req;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);


      if(type=='history'){
        console.log('type ',type);
        
        let budget_year = moment().format('YYYY');
        let whereClause = ``;
        if (searchText) {
            whereClause = `AND (proposal.company_code LIKE '%${searchText}%'
            OR proposal.title LIKE '%${searchText}%' 
            OR proposal.proposal_date LIKE '%${searchText}%'
            OR proposal.doc_no LIKE '%${searchText}%'
            OR proposal.budget_year LIKE '%${searchText}%'
            OR m_status.status_name LIKE '%${searchText}%')`;
        }

        let whereClauseCount = ``;
        if (searchText) {
            whereClauseCount = `AND (proposal.company_code LIKE '%${searchText}%'
            OR proposal.title LIKE '%${searchText}%' 
            OR proposal.proposal_date LIKE '%${searchText}%'
            OR proposal.doc_no LIKE '%${searchText}%'
            OR proposal.budget_year LIKE '%${searchText}%'
            OR m_status.status_name LIKE '%${searchText}%')`;
            offset = 0;
        }


          let queryCountTable = `SELECT COUNT(1) AS total_rows
          FROM proposal_approval
          LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
          LEFT JOIN m_division ON proposal.division_code = m_division.division_code
          LEFT JOIN m_status ON m_status.status_id = proposal.status_id
          WHERE flag = 2
          AND employee_id = '${employee_id}' AND proposal.status_id <> 99
          AND proposal.budget_year = ${budget_year}
          AND proposal.proposal_id = proposal_approval.proposal_id
          ${whereClause}
          GROUP BY proposal.proposal_id`;
          
          let queryDataTable = `SELECT proposal.proposal_id,proposal.company_code AS company_id,
          proposal.title AS name,proposal.proposal_date AS docdate,proposal.doc_no,
          proposal.budget_year AS period,m_status.status_name AS status,proposal.total_budget FROM proposal_approval 
          LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
          LEFT JOIN m_division ON proposal.division_code = m_division.division_code 
          LEFT JOIN m_status ON m_status.status_id = proposal.status_id
          WHERE flag = 2
          AND employee_id = '${employee_id}'
          AND proposal.budget_year = ${budget_year}
          AND proposal.status_id <> 99 
          ${whereClause}
          GROUP BY proposal.proposal_id 
          ORDER BY proposal_approval_id DESC limit ${offset},${limit}`;

          //console.log(queryDataTable);
          let result = await request.query(queryCountTable);
          let [rows, fields] = await request.query(queryDataTable);
          const count = searchText ? rows.length : result[0].length;

          for (let i = 0; i < rows.length; i++) {
              
              rows[i].no = i+1;
              let budget_year = rows[i].period;
              let active = 0;
              let companyfilter = ``;
              if(budget_year==2020){
                active = 0;
                companyfilter = `AND activity.company_id='${rows[i].company_id}'`
              }else{
                active = 1;
              }
        
              let sqlgetbudget = `SELECT 
              activity.activity_desc AS activity
              FROM proposal_budget pb
              LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id AND activity.year = '${budget_year}'
              LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
              LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
              LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
              WHERE pb.proposal_id = '${rows[i].proposal_id}'
              AND activity.active = ${active}
              ${companyfilter}`;

              let databudget = await request.query(sqlgetbudget);
              let budgetlist = databudget[0];

              let listactivity = [];
              for (let j = 0; j < budgetlist.length; j++) {
                  listactivity.push(budgetlist[j].activity);
              }
              var uniquelistactivity = listactivity.filter(onlyUnique);
              rows[i].activity_desc = uniquelistactivity.join(',');

              
          }

          const meta = paginate(currentPage, count, rows, pageSize);
          return res.success({
                result: rows,
                meta,
                message: "Fetch data successfully"
          });

      }else{
       
        let whereClause = ``;
        if (searchText) {
            whereClause = `AND (proposal.company_code LIKE '%${searchText}%'
            OR proposal.title LIKE '%${searchText}%' 
            OR proposal.proposal_date LIKE '%${searchText}%'
            OR proposal.doc_no LIKE '%${searchText}%'
            OR proposal.budget_year LIKE '%${searchText}%'
            OR m_status.status_name LIKE '%${searchText}%')`;
        }

        let whereClauseCount = ``;
        if (searchText) {
            whereClauseCount = `AND (proposal.company_code LIKE '%${searchText}%'
            OR proposal.title LIKE '%${searchText}%' 
            OR proposal.proposal_date LIKE '%${searchText}%'
            OR proposal.doc_no LIKE '%${searchText}%'
            OR proposal.budget_year LIKE '%${searchText}%'
            OR m_status.status_name LIKE '%${searchText}%')`;
            offset = 0;
        }


          let queryCountTable = `  SELECT COUNT(1) AS total_rows
          FROM proposal_approval
          LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
          LEFT JOIN m_division ON proposal.division_code = m_division.division_code
          LEFT JOIN m_status ON m_status.status_id = proposal.status_id
          WHERE flag = 1
          AND employee_id = '${employee_id}' AND proposal.status_id <> 99
          AND proposal.proposal_id = proposal_approval.proposal_id
          ${whereClause}
          GROUP BY proposal.proposal_id`;
          
          console.log(queryCountTable);

          let queryDataTable = `SELECT proposal.proposal_id,proposal.company_code AS company_id,
          proposal.title AS name,proposal.proposal_date AS docdate,proposal.doc_no,
          proposal.budget_year AS period,m_status.status_name AS status,proposal.total_budget FROM proposal_approval 
          LEFT JOIN proposal ON proposal_approval.proposal_id = proposal.proposal_id
          LEFT JOIN m_division ON proposal.division_code = m_division.division_code 
          LEFT JOIN m_status ON m_status.status_id = proposal.status_id
          WHERE flag = 1 
          AND employee_id = '${employee_id}' 
          AND proposal.status_id <> 99 
          ${whereClause}
          GROUP BY proposal.proposal_id 
          ORDER BY proposal_approval_id DESC limit ${offset},${limit}`;

          console.log(queryDataTable);
          let result = await request.query(queryCountTable);
          let [rows, fields] = await request.query(queryDataTable);
          const count = searchText ? rows.length : result[0].length;

          for (let i = 0; i < rows.length; i++) {
              
              rows[i].no = i+1;
              let budget_year = rows[i].period;
              let active = 0;
              let companyfilter = ``;
              if(budget_year==2020){
                active = 0;
                companyfilter = `AND activity.company_id='${rows[i].company_id}'`
              }else{
                active = 1;
              }
        
              let sqlgetbudget = `SELECT 
              activity.activity_desc AS activity
              FROM proposal_budget pb
              LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id AND activity.year = '${budget_year}'
              LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
              LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
              LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
              WHERE pb.proposal_id = '${rows[i].proposal_id}'
              AND activity.active = ${active}
              ${companyfilter}
              `;

              let databudget = await request.query(sqlgetbudget);
              let budgetlist = databudget[0];

              let listactivity = [];
              for (let j = 0; j < budgetlist.length; j++) {
                  listactivity.push(budgetlist[j].activity);
              }
              var uniquelistactivity = listactivity.filter(onlyUnique);
              rows[i].activity_desc = uniquelistactivity.join(',');


              // console.log('Proposal ID ',rows[i].proposal_id);
              // console.log('activity_desc',rows[i].activity_desc);
              
          }

          const meta = paginate(currentPage, count, rows, pageSize);
          return res.success({
                result: rows,
                meta,
                message: "Fetch data successfully"
          });
            
      }
      
    } catch (err) {
      return res.error(err);
    }
  },
  approve: async function(req, res) {
    await DB.poolConnect;
    const{
      proposal_approval_id,type,comment,employee_id,company_id
    } = req.body
    try {
      const request = await DBPROP.promise();
      console.log("bla3 >>");

      // return res.error("errorr")

      let sqlgetdataemployee = `SELECT name FROM employee WHERE employee_id='${employee_id}'`;
      let dataemployee = await request.query(sqlgetdataemployee);
      let created_by = dataemployee.length > 0 ? dataemployee[0][0].name : `Tidak Diketahui`;
      let updated_by = dataemployee.length > 0 ? dataemployee[0][0].name : `Tidak Diketahui`;

      let sqlgetdataapprove = `SELECT pp.no_appr,pp.proposal_id,
      p.total_approval,p.doc_no,p.proposal_date,p.budget_year,p.title,p.company_code,
      p.total_budget,p.mechanism,p.kpi,p.objective,p.background,
      p.created_by
      FROM proposal_approval pp 
      LEFT JOIN proposal p ON(p.proposal_id = pp.proposal_id)
      WHERE pp.proposal_approval_id = '${proposal_approval_id}'`;
      

      console.log(` cvcvc `,sqlgetdataapprove);
      let result = await request.query(sqlgetdataapprove);
      let dataapprove = result[0];
      let no_appr = dataapprove.length > 0 ? dataapprove[0].no_appr : null;
      let proposal_id = dataapprove.length > 0 ? dataapprove[0].proposal_id : null;
      let budget_year = dataapprove.length > 0 ? dataapprove[0].budget_year : null;

      

      let sqlGetJumlahApprove = `SELECT COUNT(1) AS total_rows FROM proposal_approval where proposal_id='${proposal_id}' 
      AND status_approval_id <> 1 AND employee_id='${employee_id}'`;
      console.log(sqlGetJumlahApprove);
      let resultjumlahapprove = await request.query(sqlGetJumlahApprove);
      let datajumlahapprove = resultjumlahapprove[0];
      let jumlahapprove = datajumlahapprove[0].total_rows;
      
      
      if(jumlahapprove > 0 ){
        console.log(jumlahapprove);
        return res.error({
          message: `Proses approval sudah dilakukan`
        });

      }

      // let total_approval = dataapprove.length > 0 ? dataapprove[0].total_approval : 0;
      // let proposal_no = dataapprove.length > 0 ? dataapprove[0].doc_no : '';
      // let proposal_date = dataapprove.length > 0 ? moment(dataapprove[0].proposal_date,'YYYY-MM-DD').format('YYYY-MM-DD')  : '';
      // let budget_year = dataapprove.length > 0 ? dataapprove[0].budget_year : '';
      // let title = dataapprove.length > 0 ? dataapprove[0].title : '';
      // let company_code = dataapprove.length > 0 ? dataapprove[0].company_code : '';
      // let total_budget = dataapprove.length > 0 ? dataapprove[0].total_budget : 0;
      // let mechanism = dataapprove.length > 0 ? dataapprove[0].mechanism : '';
      // let kpi = dataapprove.length > 0 ? dataapprove[0].kpi : '';
      // let objective = dataapprove.length > 0 ? dataapprove[0].objective : '';
      // let background = dataapprove.length > 0 ? dataapprove[0].background : '';
      // let createdproposal = dataapprove.length > 0 ? dataapprove[0].created_by : '';



      let komen = ``;
      if(comment){
        komen = comment;
      }

      let status = undefined;
      let flag = undefined;

      if(type==='AP'){
        status = 2;
        flag = 2;
      }else if(type==='RJ'){
        status = 3;
        flag = 99;

      }
      komen = komen.replace(/[']/g,'')


      let sqlInsertHistoryApproval = `INSERT INTO history_appr
                                    (employee_id, status_approval_id, date_approval, comment, 
                                      proposal_id, created_by, created_date, updated_by, updated_date)
                                    VALUES('${employee_id}', '${status}', now(), '${komen}', 
                                    ${proposal_id}, '${created_by}', now(), '${created_by}',now())`;

      let DeleteHistoryJikaBudgetTidakCukup = `DELETE FROM history_appr WHERE employee_id='${employee_id}' 
      AND proposal_id=${proposal_id} AND status_approval_id='${status}'`;
      await request.query(DeleteHistoryJikaBudgetTidakCukup);                        
      await request.query(sqlInsertHistoryApproval);

       if(type==='RJ'){

        let sqlUpdateApproval = `UPDATE proposal_approval SET flag=9,status_approval_id=3 WHERE proposal_id=${proposal_id} 
        AND employee_id = '${employee_id}' 
        AND proposal_approval_id = ${proposal_approval_id}`;
        await request.query(sqlUpdateApproval);

        let sqlUpdateStatusApprovalProposal = `UPDATE proposal SET status_id=99,reject_date=now() WHERE proposal_id=${proposal_id}`;
        await request.query(sqlUpdateStatusApprovalProposal);


        let sqlGetEksekutor = `SELECT e.employee_id,e.name FROM proposal_executor pe,employee e 
        WHERE pe.employee_id = e.id 
        AND pe.proposal_id=${proposal_id}`;
        let dataeksekutor = await request.query(sqlGetEksekutor);
        let eksekutorlist = dataeksekutor[0];

        for (let i = 0; i < eksekutorlist.length; i++) {
            
          eksekutorlist[i].nomor = i + 1;
        

        }

        let sqlGetApproval = `SELECT name,position_appr,status_approval_desc,flag,comment 
        FROM v_appr_history WHERE proposal_id = '${proposal_id}' ORDER BY no_appr ASC`;
        let dataapproval = await request.query(sqlGetApproval);
        let approvallist = dataapproval[0];

        for (let i = 0; i < approvallist.length; i++) {
            
          approvallist[i].nomor = i + 1;
          approvallist[i].comment = approvallist[i].comment == null ? '' : approvallist[i].comment
        

        }



        let sqlgetbudget = `SELECT 
        pb.proposal_budget_id,
        act.division,
        mbch.branch_code,
        mbch.branch_desc AS branch,
        act.activity_desc AS activity,
        pb.budget,
        act.activity_code,
        mb.brand_code,
        mb.brand_code AS brand,
        mc.company_id,
        pb.nilai_so,
        pb.bulan
        FROM proposal_budget pb
        LEFT JOIN m_activity act ON act.activity_code = pb.activity_id AND act.year = '${budget_year}'
        LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
        LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
        LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id
        LEFT JOIN m_company mc ON mc.company_code = p.company_code
        WHERE pb.proposal_id = '${proposal_id}' GROUP BY pb.activity_id, pb.brand_code, pb.branch_code`;
      
      let databudget = await request.query(sqlgetbudget);
      let budgetlist = databudget[0];

      for (let i = 0; i < budgetlist.length; i++) {
            
        budgetlist[i].nomor = i + 1;
      

      }


      SendEmailExecutor(proposal_id);
      SendEmailCreatedBy(proposal_id);
      SendEmailAll(proposal_id,no_appr,type);
        
      let updateIsmigration = `UPDATE proposal_budget SET ismigration = 'N' WHERE proposal_id = '${proposal_id}'`;
      await request.query(updateIsmigration);

      return res.success({
        result: proposal_id,
        message: "Reject successfully"
      });

    }else if(type==='AP'){

      // console.log('APPROVE YA');
      let error_budget = [];
      let sqlgetmaxapproval = `SELECT * FROM proposal_approval a WHERE a.proposal_id = '${proposal_id}' AND a.status_approval_id = 1`;
      let datamaxapproval = await request.query(sqlgetmaxapproval);
      let maxapproval = datamaxapproval[0];
      let max_appr = maxapproval.length;
      // console.log('max_appr ',max_appr);

      if( max_appr == 1 ){

        let sqlgetallbudget = `SELECT * FROM proposal_budget pb
        LEFT JOIN m_brand mb ON (mb.brand_code = pb.brand_code)
        LEFT JOIN m_company mcp ON (mb.company_id = mcp.company_id)
        LEFT JOIN m_branch mbc ON (pb.branch_code = mbc.branch_code)
        LEFT JOIN m_activity mc ON (pb.activity_id = mc.activity_code AND mc.year = '${budget_year}')
        WHERE pb.proposal_id = ${proposal_id} AND mc.active=1`;

        // console.log("budget aju :",sqlgetallbudget);
        let dataallbudget = await request.query(sqlgetallbudget);
        let allbudget = dataallbudget[0];

        let sqlgetCompany = `SELECT mc.company_id FROM proposal p LEFT JOIN m_company mc ON(mc.company_code = p.company_code) 
        WHERE proposal_id='${proposal_id}'`;
        let datacompany = await request.query(sqlgetCompany);
        let var_company_id = datacompany[0][0].company_id;


        for (let i = 0; i < allbudget.length; i++) {
          
          allbudget[i].no = i+1;
          let activity_code = allbudget[i].activity_code;
          let brand_code = allbudget[i].brand_code;
          let diajukan = allbudget[i].budget;
          let bulan = allbudget[i].bulan;
  

    
          let sqlgetbudgetactivity = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
          FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
          LEFT JOIN m_group ON budget.group_id = m_group.id_group 
          WHERE budget.activity_code = '${activity_code}'
          AND budget.year = '${budget_year}' 
          AND budget.brand_code = '${brand_code}'
          AND budget.bulan = ${bulan}`;
          // console.log(sqlgetbudgetactivity);


          let databudgetactivity = await request.query(sqlgetbudgetactivity);
          let budgetactivity =  Number(databudgetactivity[0][0].total);

      
          let sqlgetbudgetperactivity = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
          INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
          LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.year = '${budget_year}'
          WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}'
          AND proposal.status_id NOT IN (99)
          AND proposal_budget.bulan =  ${bulan}
          AND activity.activity_code = proposal_budget.activity_id
          AND proposal_budget.activity_id = '${activity_code}'`;
          // console.log(sqlgetbudgetperactivity);



          let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
          let budgetperactivity = databudgetperactivity[0][0].total ? Number(databudgetperactivity[0][0].total) : 0;
          let sisa = budgetactivity - budgetperactivity;


          // console.log('budgetactivity ',budgetactivity);
          // console.log('budgetperactivity ',budgetperactivity);
          // console.log('sisa ',sisa);
          // console.log('diajukan ',diajukan);
    
          // console.log('balance ',diajukan,balance);

          if( sisa < 0 ) {
            error_budget.push('Budget tidak cukup');
            console.log("masuk gacukup");
          }else{
            console.log("masuk cukup");
          }

        }

        if(error_budget.length==0){

          
          let sqlUpdateProposal = `UPDATE proposal SET status_id=30,approve_date=now() WHERE proposal_id=${proposal_id}`;
          await request.query(sqlUpdateProposal);

          let sqlUpdateApproval = `UPDATE proposal_approval 
          SET flag=2,
          status_approval_id=2, 
          updated_by = '${updated_by}',
          updated_date = now()
          WHERE proposal_id=${proposal_id} 
          AND employee_id = '${employee_id}' 
          AND proposal_approval_id = ${proposal_approval_id}`;
          await request.query(sqlUpdateApproval);

          // sendmail_executor($proposal_id);
          // send_mail_createdby($proposal_id);
          // sendmail_all($proposal_id);


          SendEmailExecutor(proposal_id);
          SendEmailCreatedBy(proposal_id);
          SendEmailAll(proposal_id,no_appr,type);


          let updateIsmigration = `UPDATE proposal_budget SET ismigration = 'N' WHERE proposal_id = '${proposal_id}'`;
          await request.query(updateIsmigration);


          return res.success({
            result: proposal_id,
            message: "Approve successfully"
          });


          
          }else{
            await request.query(DeleteHistoryJikaBudgetTidakCukup);
            return res.error({
              message: error_budget.toString()
            });

          }
      
      } else {
        //echo "disini";
        
        let sqlUpdateProposal = `UPDATE proposal SET status_id=20 WHERE proposal_id=${proposal_id}`;
        await request.query(sqlUpdateProposal);
        

        let sqlUpdateProposalApproval = `UPDATE proposal_approval SET status_approval_id=2,flag=2 WHERE proposal_id=${proposal_id} AND employee_id='${employee_id}'`;
        await request.query(sqlUpdateProposalApproval);
        

        let sqlGetJumlahApproval = `SELECT COUNT(1) AS jumlah FROM  proposal_approval WHERE no_appr=${no_appr} AND proposal_id = ${proposal_id} AND status_approval_id = 1`;
        let resultjumlah = await request.query(sqlGetJumlahApproval);
        let dataresultjumlah = resultjumlah[0];
        let jml = dataresultjumlah.length > 0 ? dataresultjumlah[0].jumlah : 0;

        // echo $this->db->last_query();die();
        if( jml == 0 ){
            
            let max = 0;
            let j = 0;
            do {
                no_appr++;
                max++;
                let sqldataj = `SELECT COUNT(1) AS jumlah FROM proposal_approval WHERE proposal_id=${proposal_id} AND no_appr=${no_appr}`;
                let dataresult = await request.query(sqldataj);
                let dataj = dataresult[0];
                j = dataj[0].jumlah;

            } while( j == 0 && $max <= 5 );
 
            let qq = `UPDATE proposal_approval SET flag = 1 where proposal_id = ${proposal_id} AND no_appr = ${no_appr}`;
            await request.query(qq);

            SendEmailApproval(proposal_id,no_appr);

            let updateIsmigration = `UPDATE proposal_budget SET ismigration = 'N' WHERE proposal_id = '${proposal_id}'`;
            await request.query(updateIsmigration);

            return res.success({
              result: proposal_id,
              message: "Approve successfully"
            });
            
            // sendmail($proposal_id,$no_appr);
            


        } else {
            // sendmail($proposal_id,$no_appr);
            SendEmailApproval(proposal_id,no_appr);
            return res.success({
              result: proposal_id,
              message: "Approve successfully"
            });
        }
        
      }

    }

    } catch (err) {
      return res.error(err);
    }
  },

  dummystatic: async function(req, res) {
    return res.sendFile(approveHtml);
    //yg di bawah contoh load reject HTMLs
    // return res.sendFile(rejectHtml);
  },

  approvebylink: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = await DBPROP.promise();


      let params = req.params;
      let proposal_approval_id = params.proposal_approval_id;
      let type = params.type;
      let employee_id = params.employee_id;
      let company_id = params.company_id;
      let comment = 'Approved'

      let sqlgetdataemployee = `SELECT name FROM employee WHERE employee_id='${employee_id}'`;
      let dataemployee = await request.query(sqlgetdataemployee);
      let created_by = dataemployee.length > 0 ? dataemployee[0][0].name : `Tidak Diketahui`;
      let updated_by = dataemployee.length > 0 ? dataemployee[0][0].name : `Tidak Diketahui`;

      let sqlgetdataapprove = `SELECT pp.no_appr,pp.proposal_id,
      p.total_approval,p.doc_no,p.proposal_date,p.budget_year,p.title,p.company_code,
      p.total_budget,p.mechanism,p.kpi,p.objective,p.background,
      p.created_by
      FROM proposal_approval pp 
      LEFT JOIN proposal p ON(p.proposal_id = pp.proposal_id)
      WHERE pp.proposal_approval_id = '${proposal_approval_id}'`;

      

      let result = await request.query(sqlgetdataapprove);
      let dataapprove = result[0];
      let no_appr = dataapprove.length > 0 ? dataapprove[0].no_appr : null;
      let proposal_id = dataapprove.length > 0 ? dataapprove[0].proposal_id : null;


      let sqlGetJumlahApprove = `SELECT COUNT(1) AS total_rows FROM proposal_approval where proposal_id='${proposal_id}' 
      AND status_approval_id <> 1 AND employee_id='${employee_id}'`;
      let resultjumlahapprove = await request.query(sqlGetJumlahApprove);
      let datajumlahapprove = resultjumlahapprove[0];
      let jumlahapprove = datajumlahapprove[0].total_rows;

      let total_approval = dataapprove.length > 0 ? dataapprove[0].total_approval : 0;
      let proposal_no = dataapprove.length > 0 ? dataapprove[0].doc_no : '';
      let proposal_date = dataapprove.length > 0 ? moment(dataapprove[0].proposal_date,'YYYY-MM-DD').format('YYYY-MM-DD')  : '';
      let budget_year = dataapprove.length > 0 ? dataapprove[0].budget_year : '';
      let title = dataapprove.length > 0 ? dataapprove[0].title : '';
      let company_code = dataapprove.length > 0 ? dataapprove[0].company_code : '';
      let total_budget = dataapprove.length > 0 ? dataapprove[0].total_budget : 0;
      let mechanism = dataapprove.length > 0 ? dataapprove[0].mechanism : '';
      let kpi = dataapprove.length > 0 ? dataapprove[0].kpi : '';
      let objective = dataapprove.length > 0 ? dataapprove[0].objective : '';
      let background = dataapprove.length > 0 ? dataapprove[0].background : '';
      let createdproposal = dataapprove.length > 0 ? dataapprove[0].created_by : '';

      if(jumlahapprove > 0 ){

        let param = {
          keterangan:'Proposal ini sudah diproses',
          proposal_no:proposal_no,
          favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
          baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
          baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
          baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
          baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
          baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
          baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
        }
  
        let locationFiles = dokumentPath('eprop','hasbeenapprove');
        shell.mkdir('-p', locationFiles);
        let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: param});
        fs.writeFileSync(locationFiles+'/'+`${proposal_id}`+".html", templateHtml); 
        let file = path.join(locationFiles+'/'+`${proposal_id}`+".html");    
        return res.sendFile(file);

      }



      // let paramEmail = {
      //   proposal_no:proposal_no,
      //   favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
      //   baseurl:baseurl().replace(/\\/g, '/'),
      //   baseurl2:baseurl().replace(/\\/g, '/'),
      //   baseurl3:baseurl().replace(/\\/g, '/'),
      //   baseurl4:baseurl().replace(/\\/g, '/')
      // }

      // console.log(paramEmail);


      // let templateEmail = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: paramEmail});
      // console.log(templateEmail);


      let komen = ``;
      if(comment){
        komen = comment;
      }

      let status = undefined;
      let flag = undefined;

      if(type==='AP'){
        status = 2;
        flag = 2;
      }else if(type==='RJ'){
        status = 3;
        flag = 99;

      }


      let sqlInsertHistoryApproval = `INSERT INTO history_appr
                                    (employee_id, status_approval_id, date_approval, comment, 
                                      proposal_id, created_by, created_date, updated_by, updated_date)
                                    VALUES('${employee_id}', '${status}', now(), '${komen}', 
                                    ${proposal_id}, '${created_by}', now(), '${created_by}',now())`;
      
      let DeleteHistoryJikaBudgetTidakCukup = `DELETE FROM history_appr WHERE employee_id='${employee_id}' 
      AND proposal_id=${proposal_id} AND status_approval_id='${status}'`;
        await request.query(DeleteHistoryJikaBudgetTidakCukup);     
       await request.query(sqlInsertHistoryApproval);

       if(type==='RJ'){

        let sqlUpdateApproval = `UPDATE proposal_approval SET flag=9,status_approval_id=3 WHERE proposal_id=${proposal_id} 
        AND employee_id = '${employee_id}' 
        AND proposal_approval_id = ${proposal_approval_id}`;
        await request.query(sqlUpdateApproval);

        let sqlUpdateStatusApprovalProposal = `UPDATE proposal SET status_id=99,reject_date=now() WHERE proposal_id=${proposal_id}`;
        await request.query(sqlUpdateStatusApprovalProposal);


        let sqlGetEksekutor = `SELECT e.employee_id,e.name FROM proposal_executor pe,employee e 
        WHERE pe.employee_id = e.id 
        AND pe.proposal_id=${proposal_id}`;
        let dataeksekutor = await request.query(sqlGetEksekutor);
        let eksekutorlist = dataeksekutor[0];

        for (let i = 0; i < eksekutorlist.length; i++) {
            
          eksekutorlist[i].nomor = i + 1;
        

        }

        let sqlGetApproval = `SELECT name,position_appr,status_approval_desc,flag,comment 
        FROM v_appr_history WHERE proposal_id = '${proposal_id}' ORDER BY no_appr ASC`;
        let dataapproval = await request.query(sqlGetApproval);
        let approvallist = dataapproval[0];

        for (let i = 0; i < approvallist.length; i++) {
            
          approvallist[i].nomor = i + 1;
          approvallist[i].comment = approvallist[i].comment == null ? '' : approvallist[i].comment
        

        }



        let sqlgetbudget = `SELECT 
        pb.proposal_budget_id,
        act.division,
        mbch.branch_code,
        mbch.branch_desc AS branch,
        act.activity_desc AS activity,
        pb.budget,
        pb.bulan,
        act.activity_code,
        mb.brand_code,
        mb.brand_code AS brand,
        pb.nilai_so
        FROM proposal_budget pb
        LEFT JOIN m_activity act ON act.activity_code = pb.activity_id AND act.year = '${budget_year}'
        LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
        LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
        LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
        WHERE pb.proposal_id = '${proposal_id}' GROUP BY pb.activity_id, pb.brand_code, pb.branch_code`;
      
      let databudget = await request.query(sqlgetbudget);
      let budgetlist = databudget[0];


      for (let i = 0; i < budgetlist.length; i++) {
            
        budgetlist[i].nomor = i + 1;
      

      }


      SendEmailExecutor(proposal_id);
      SendEmailCreatedBy(proposal_id);
      SendEmailAll(proposal_id,no_appr,type);
        
      

     
      let param = {
        keterangan:'Proposal Berhasil direject !',
        proposal_no:proposal_no,
        favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
        baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
        baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
        baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
        baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
        baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
        baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
      }

      let locationFiles = dokumentPath('eprop','hasbeenapprove');
      shell.mkdir('-p', locationFiles);
      let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: param});
      fs.writeFileSync(locationFiles+'/'+`${proposal_id}`+".html", templateHtml); 
      let file = path.join(locationFiles+'/'+`${proposal_id}`+".html");    
      return res.sendFile(file);

    }else if(type==='AP'){

      let error_budget = [];
      let sqlgetmaxapproval = `SELECT * FROM proposal_approval a WHERE a.proposal_id = '${proposal_id}' AND a.status_approval_id = 1`;


      let datamaxapproval = await request.query(sqlgetmaxapproval);
      let maxapproval = datamaxapproval[0];
      let max_appr = maxapproval.length;
      //console.log('max_appr ',max_appr);
      if( max_appr == 1 ){

        let sqlgetallbudget = `SELECT * FROM proposal_budget pb
        LEFT JOIN m_brand mb ON (mb.brand_code = pb.brand_code)
        LEFT JOIN m_company mcp ON (mb.company_id = mcp.company_id)
        LEFT JOIN m_branch mbc ON (pb.branch_code = mbc.branch_code)
        LEFT JOIN m_activity mc ON (pb.activity_id = mc.activity_code AND mc.year = '${budget_year}')
        WHERE pb.proposal_id = ${proposal_id} AND mc.active=1`;
        //console.log(sqlgetallbudget);
        let dataallbudget = await request.query(sqlgetallbudget);
        let allbudget = dataallbudget[0];

        //console.log(allbudget)
  
        for (let i = 0; i < allbudget.length; i++) {
          
          allbudget[i].no = i+1;
          let activity_code = allbudget[i].activity_code;
          let brand_code = allbudget[i].brand_code;
          // let sqlBudgetYear = `SELECT budget_year FROM proposal WHERE proposal_id = '${allbudget[i].proposal_id}'`;
          // let databudgetyear = await request.query(sqlBudgetYear);
          // let budget_year = databudgetyear[0];
          // let year = budget_year.length > 0 ? budget_year[0].budget_year : moment().format('YYYY');
          let diajukan = allbudget[i].budget;
          let bulan_start = budget_year.length > 0 ? Number(moment(budget_year[0].start_date,'YYYY-MM-DD').format('MM')): 0;
          let bulan_end = budget_year.length > 0 ? Number(moment(budget_year[0].end_date,'YYYY-MM-DD').format('MM')): 0;
          let bulan_array = [];
          let bulan = allbudget[i].bulan;


          for (let i = bulan_start; i <= bulan_end; i++) {
           
              bulan_array.push(i);
            
          }
    
          let bulan_arr = "";
          for (const datas of bulan_array) {
            bulan_arr += ",'" + datas + "'"
          }
          bulan_arr = bulan_arr.substring(1);


          
          let sqlgetbudgetactivity = `SELECT COALESCE(SUM(budget),0) as total,m_group.group_name,m_brand.brand_desc 
          FROM budget LEFT JOIN m_brand ON budget.brand_code = m_brand.brand_code 
          LEFT JOIN m_group ON budget.group_id = m_group.id_group 
          WHERE budget.activity_code = '${activity_code}'
          AND budget.year = '${budget_year}' 
          AND budget.brand_code = '${brand_code}'
          AND budget.bulan = ${bulan}`;
          console.log(sqlgetbudgetactivity);


          let databudgetactivity = await request.query(sqlgetbudgetactivity);
          let budgetactivity =  Number(databudgetactivity[0][0].total);

      
          let sqlgetbudgetperactivity = `SELECT SUM(CASE WHEN nilai_so > 0 THEN nilai_so ELSE budget END) as total FROM proposal_budget 
          INNER JOIN proposal ON proposal.proposal_id = proposal_budget.proposal_id 
          LEFT JOIN m_activity activity ON proposal_budget.activity_id = activity.activity_code AND activity.year = '${budget_year}'
          WHERE brand_code ='${brand_code}' AND budget_year = '${budget_year}'
          AND proposal.status_id NOT IN (99)
          AND proposal_budget.bulan =  ${bulan}
          AND activity.activity_code = proposal_budget.activity_id
          AND proposal_budget.activity_id = '${activity_code}'`;
          console.log(sqlgetbudgetperactivity);


          let sqlCekReversal = ` SELECT COALESCE(SUM(pr.reverse_amount),0) AS reverse_amount 
          FROM proposal_budget pb,proposal_reverse pr,proposal p 
          WHERE pb.proposal_budget_id = pr.proposal_budget_id
          AND pb.brand_code = '${brand_code}'
          AND pb.activity_id = '${activity_code}'
          AND p.proposal_id = pb.proposal_id
          AND pb.bulan is not null
          AND p.status_id <> 99
          AND p.budget_year = ${budget_year}
          AND pb.bulan = ${bulan}`;

          // console.log(sqlCekReversal);

          
          let getdataReversal = await request.query(sqlCekReversal);
          let reversalAmount = getdataReversal[0][0].reverse_amount;



          let databudgetperactivity = await request.query(sqlgetbudgetperactivity);
          let budgetperactivity = databudgetperactivity[0][0].total ? Number(databudgetperactivity[0][0].total) : 0;
          let sisa = budgetactivity - (budgetperactivity - reversalAmount);

  
          if( sisa <  0 ) {
            error_budget.push('Budget tidak cukup');
          }


        }

        // console.log('error_budget ',error_budget);


        if(error_budget.length==0){

          
          let sqlUpdateProposal = `UPDATE proposal SET status_id=30,approve_date=now() WHERE proposal_id=${proposal_id}`;
          await request.query(sqlUpdateProposal);

          let sqlUpdateApproval = `UPDATE proposal_approval 
          SET flag=2,
          status_approval_id=2, 
          updated_by = '${updated_by}',
          updated_date = now()
          WHERE proposal_id=${proposal_id} 
          AND employee_id = '${employee_id}' 
          AND proposal_approval_id = ${proposal_approval_id}`;
          await request.query(sqlUpdateApproval);

          // sendmail_executor($proposal_id);
          // send_mail_createdby($proposal_id);
          // sendmail_all($proposal_id);


          SendEmailExecutor(proposal_id);
          SendEmailCreatedBy(proposal_id);
          SendEmailAll(proposal_id,no_appr,type);

          // return res.success({
          //   result: proposal_id,
          //   message: "Approve successfully"
          // });

          let param = {
            keterangan:'Proposal Berhasil diapprove !',
            proposal_no:proposal_no,
            favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
            baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
            baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
            baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
            baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
            baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
            baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
          }
    
          let locationFiles = dokumentPath('eprop','hasbeenapprove');
          shell.mkdir('-p', locationFiles);
          let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: param});
          fs.writeFileSync(locationFiles+'/'+`${proposal_id}`+".html", templateHtml); 
          let file = path.join(locationFiles+'/'+`${proposal_id}`+".html");    
          return res.sendFile(file);


          }else{
            //console.log(DeleteHistoryJikaBudgetTidakCukup);
            await request.query(DeleteHistoryJikaBudgetTidakCukup);
            
            let param = {
              keterangan:'Budget proposal tidak cukup !',
              proposal_no:proposal_no,
              favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
              baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
            }
      
            let locationFiles = dokumentPath('eprop','hasbeenapprove');
            shell.mkdir('-p', locationFiles);
            let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: param});
            fs.writeFileSync(locationFiles+'/'+`${proposal_id}`+".html", templateHtml); 
            let file = path.join(locationFiles+'/'+`${proposal_id}`+".html");    
            return res.sendFile(file);
  
          }
      
      } else {
        //echo "disini";
        
        let sqlUpdateProposal = `UPDATE proposal SET status_id=20 WHERE proposal_id=${proposal_id}`;
        await request.query(sqlUpdateProposal);
        

        let sqlUpdateProposalApproval = `UPDATE proposal_approval SET status_approval_id=2,flag=2 WHERE proposal_id=${proposal_id} AND employee_id='${employee_id}'`;
        await request.query(sqlUpdateProposalApproval);
        

        let sqlGetJumlahApproval = `SELECT COUNT(1) AS jumlah FROM  proposal_approval WHERE no_appr=${no_appr} AND proposal_id = ${proposal_id} AND status_approval_id = 1`;
        let resultjumlah = await request.query(sqlGetJumlahApproval);
        let dataresultjumlah = resultjumlah[0];
        let jml = dataresultjumlah.length > 0 ? dataresultjumlah[0].jumlah : 0;

        // echo $this->db->last_query();die();
        if( jml == 0 ){
            
            let max = 0;
            let j = 0;
            do {
                no_appr++;
                max++;
                let sqldataj = `SELECT COUNT(1) AS jumlah FROM proposal_approval WHERE proposal_id=${proposal_id} AND no_appr=${no_appr}`;
                let dataresult = await request.query(sqldataj);
                let dataj = dataresult[0];
                j = dataj[0].jumlah;

            } while( j == 0 && $max <= 5 );
 
            let qq = `UPDATE proposal_approval SET flag = 1 where proposal_id = ${proposal_id} AND no_appr = ${no_appr}`;
            await request.query(qq);
            
            SendEmailApproval(proposal_id,no_appr);

            let param = {
              keterangan:'Proposal berhasil diapprove !',
              proposal_no:proposal_no,
              favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
              baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
            }
      
            let locationFiles = dokumentPath('eprop','hasbeenapprove');
            shell.mkdir('-p', locationFiles);
            let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: param});
            fs.writeFileSync(locationFiles+'/'+`${proposal_id}`+".html", templateHtml); 
            let file = path.join(locationFiles+'/'+`${proposal_id}`+".html");    
            return res.sendFile(file);

            
            


        } else {

          //SendEmailApproval(proposal_id,no_appr);

            let param = {
              keterangan:'Proposal berhasil diapprove !',
              proposal_no:proposal_no,
              favicon:`data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA25pVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpERjk4NDhCOUU5MjQxMUU1ODRFOUZDMDVFNjQ3ODhGMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGMzU1RjE4NjM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGMzU1RjE4NTM3ODcxMUU2QTE3QUQ2ODNBNDAxM0RFRiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxNSAoV2luZG93cykiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4NmZhNTcwNi04MjJhLTM4NDYtYjE1Mi0zZmQ1MjFmNDJjNDEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6REY5ODQ4QjlFOTI0MTFFNTg0RTlGQzA1RTY0Nzg4RjEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5ueJJWAAABa0lEQVR42qTTzSsFURjH8UsshJQSImVBUsQ/YCFlhc1NUcQCxY4Sxd5VpJSULCjqut6FQllgj/JSFMqCUiTKS4zvqd+pY7q7+9SnmTlnnue8zcR5nheIJeLqgh3+tiy0oAJ5+MIl1hB2X1yNTAYSfMntGEGKr70cDehBPW5thymQjHf0IuRL3ME+PlCJGlygCHe2QDeOoyQHseQ8j2l0s4xdFJrGeLxg3ZfcpOR0zGAeBVjAhO6DtsC4NmwWTypwoxHMdJu1/gH1TenaapeQgQMxkYsSZGJY+/PqzDLfvZoCZYhgDtvYxH2UIzeb3YhRPX/bJZwiDZ3YwLmTtAxP3jRIpvrubYFHHZUNc0TVuu/Spl3hU4VsLNolmBjEodO5glrsqYiNRGQjFWd2BiaOMOS8mKSzDusESpGjz/zBJrsFTPSjDz9OW72+gROteQvF7s76/4WQpt+GKo34i2tt8DSe//2Nsf7OfwIMAHxiV63lX25TAAAAAElFTkSuQmCC`,
              baseurl: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl2: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl3: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl4: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl5: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */,
              baseurl6: 'https://esales.enesis.com/api' /* baseurl().replace(/\\/g, '/') */
            }
      
            let locationFiles = dokumentPath('eprop','hasbeenapprove');
            shell.mkdir('-p', locationFiles);
            let templateHtml = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'isapprove', templateparam: param});
            fs.writeFileSync(locationFiles+'/'+`${proposal_id}`+".html", templateHtml); 
            let file = path.join(locationFiles+'/'+`${proposal_id}`+".html");    
            return res.sendFile(file);

        }
        
      }

    }

    } catch (err) {
      return res.error(err);
    }
  },

  cancel: async function(req, res) {
    const {m_user_id,proposal_id,reason} = req.body;
      await DB.poolConnect;
      try {
    
      const request = await DBPROP.promise();
      const request2 = DB.pool.request();


      let validation = [];
      let sqldatabudget = `SELECT * FROM proposal_budget WHERE proposal_id='${proposal_id}'`;
      let databudget = await request.query(sqldatabudget);
      let budget = databudget[0]

      for (let i = 0; i < budget.length; i++) {
          
        let proposal_budget_id = budget[i].proposal_budget_id;
        let sqlgetdataklaim = `SELECT * FROM klaim_detail WHERE budget_id = '${proposal_budget_id}'`;
        let dataklaim = await request2.query(sqlgetdataklaim);

        if(dataklaim.recordset.length > 0){
          validation.push('Nomor Proposal sudah pernah diklaim maka tidak dapat cancel');
        }
        
      }


      if(validation.length > 0){
        return res.success({
          message: validation[0]
        });
      }else{

      let UpdateProposal = `UPDATE proposal SET iscancel='Y',m_user_id='${m_user_id}',status_id=99,
      reason='${reason}',cancel_date=now()
      WHERE proposal_id = '${proposal_id}'`;
      await request.query(UpdateProposal);


      let sqlGetDataUser = `SELECT nik,nama FROM m_user WHERE m_user_id = '${m_user_id}'`;
      let getDataUser = await request2.query(sqlGetDataUser);
      let employee_id = getDataUser.recordset.length > 0 ? getDataUser.recordset[0].nik : null;
      let created_by = getDataUser.recordset.length > 0 ? getDataUser.recordset[0].nama : null;

      if(employee_id){

        let reasonCancel = reason && reason !='' ? `'${reason}'` : 'NULL';

        let sqlInsertHistoryApproval = `INSERT INTO history_appr
        (employee_id, status_approval_id, date_approval, comment, 
        proposal_id, created_by, created_date, updated_by, updated_date)
        VALUES('${employee_id}', '3', now(), ${reasonCancel}, 
        ${proposal_id}, '${created_by}', now(), '${created_by}',now())`;
        await request.query(sqlInsertHistoryApproval);

      }

  

  
      return res.success({
        message: "Cancel Proposal Success"
      });
      }



    } catch (err) {
        return res.error(err);
      }
  
    
    },

}


function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}