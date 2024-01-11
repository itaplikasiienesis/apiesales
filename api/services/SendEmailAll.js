const Base64 = require('base-64');
const fs = require('fs');
const DBPROP = require("./DBPROPOSAL");
const SendEmail = require('./SendEmail');
const path = require('path');
const moment = require("moment");
const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'emailtemplate');
const numeral = require('numeral');


module.exports = async function(proposal_id,no_appr,type) {

    try {
        const request = await DBPROP.promise();
        let sqlGetProposal = `SELECT * FROM proposal WHERE proposal_id=${proposal_id}`;
        let result = await request.query(sqlGetProposal);
        let dataapprove = result[0];
        let proposal_no = dataapprove.length > 0 ? dataapprove[0].doc_no : '';
        let status_id = dataapprove.length > 0 ? dataapprove[0].status_id : '';
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
        let start_date = dataapprove.length > 0 ? moment(dataapprove[0].start_date,'YYYY-MM-DD').format('YYYY-MM-DD')  : '';
        let end_date = dataapprove.length > 0 ? moment(dataapprove[0].end_date,'YYYY-MM-DD').format('YYYY-MM-DD')  : '';


        let sqlGetEksekutor = `SELECT e.employee_id,e.name,e.email FROM proposal_executor pe,employee e 
        WHERE pe.employee_id = e.id 
        AND pe.proposal_id=${proposal_id}`;
        let dataeksekutor = await request.query(sqlGetEksekutor);
        let eksekutorlist = dataeksekutor[0];

        for (let i = 0; i < eksekutorlist.length; i++) {
            
          eksekutorlist[i].nomor = i + 1;

        }

        let sqlGetApproval = ``;

        if(type=='RJ'){

            // sqlGetApproval = `SELECT employee_id,email,name,position_appr,status_approval_desc,comment 
            // FROM v_appr_history WHERE proposal_id = '${proposal_id}' AND no_appr < ${no_appr} ORDER BY no_appr ASC`;

            sqlGetApproval = `SELECT employee_id,email,name,position_appr,status_approval_desc 
            FROM v_appr_history WHERE proposal_id = '${proposal_id}' AND no_appr < ${no_appr} ORDER BY no_appr ASC`;

        }else{

            // sqlGetApproval = `SELECT employee_id,email,name,position_appr,status_approval_desc,comment
            // FROM v_appr_history WHERE proposal_id = '${proposal_id}' ORDER BY no_appr ASC`;

            sqlGetApproval = `SELECT employee_id,email,name,position_appr,status_approval_desc
            FROM v_appr_history WHERE proposal_id = '${proposal_id}' ORDER BY no_appr ASC`;
        }


        let dataapproval = await request.query(sqlGetApproval);
        let approvallist = dataapproval[0];

        for (let i = 0; i < approvallist.length; i++) {
            
          approvallist[i].nomor = i + 1;
          // approvallist[i].comment = approvallist[i].comment == null ? '' : approvallist[i].comment
        

        }



        let sqlgetbudget = `SELECT 
        pb.proposal_budget_id,
        p.division_code AS division,
        mbch.branch_code,
        mbch.branch_desc AS branch,
        act.activity_desc AS activity,
        pb.budget,
        pb.bulan,
        act.activity_code,
        mb.brand_code,
        mb.brand_code AS brand,
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
    	  end AS periode
        FROM proposal_budget pb
        LEFT JOIN m_activity act ON act.activity_code = pb.activity_id 
        LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
        LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
        LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
        WHERE pb.proposal_id = '${proposal_id}' GROUP BY pb.activity_id, pb.brand_code, pb.branch_code`;
      
        let databudget = await request.query(sqlgetbudget);
        let budgetlist = databudget[0];
  
  
        for (let i = 0; i < budgetlist.length; i++) {
              
          budgetlist[i].nomor = i + 1;
          budgetlist[i].periode = convertBulan(budgetlist[i].bulan);
  
        }

        
        let detailseksekutor = _generateDataEksekutor(eksekutorlist);
        let detailapproval = _generateDataApproval(approvallist);
        let detailbudget = _generateDataBudget(budgetlist);
        //let logo = 'data:image/png;base64,' + Buffer.from(base64_encode(path.resolve(sails.config.appPath, 'assets', 'report', 'fkr', 'assets', 'log2.png')));
        let logo = `data:image/jpeg;base64,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`;



        // let sqlgetemailEmployee = `SELECT * FROM employee e WHERE e.employee_id='${createdproposal}' and email IS NOT NULL AND active=1`;
        // let dataemailemployee = await request.query(sqlgetemailEmployee);
        // let emailemployee = dataemailemployee[0];

        



        for (let i = 0; i < approvallist.length; i++) {
            
            approvallist[i].nomor = i + 1;
            // approvallist[i].comment = approvallist[i].comment == null ? '' : approvallist[i].comment;

            let status_deskripsi = status_id==30 ? 'Proposal Diterima': 'Proposal Ditolak';
            let bgcolor = status_id==30 ? '#4ec7ff' : '#FF0175';
            let status_deskripsi_createdby = status_id==30 ? 'Berikut Data Proposal Anda yang diterima': 'Berikut Data Proposal Anda yang ditolak';
            let nama_approval = approvallist[i].name;
            let employee_id = approvallist[i].employee_id;
            let status_proposal = status_id==30 ? 'APPROVED': 'REJECTED';
            let dataemail = [];

            if( employee_id == 'dist' ){
                let sqlGetEmailDistributor = `SELECT email_distributor FROM proposal_email_distributor WHERE proposal_id=${proposal_id}`;
                let dataemaildistributor = await request.query(sqlGetEmailDistributor);
                let emaildistributor = dataemaildistributor[0];

                if(emaildistributor.length > 0){
                    dataemail.push(emaildistributor);
                }
                
            }else{
                    dataemail.push(approvallist[i].email);
            }
		



            let paramEmailAll = {
            
                subject:`E-PROPOSAL (Approval) ${proposal_no}  - YOUR PROPOSAL IS ${status_proposal}`,
                proposal_date:proposal_date,
                start_date:start_date,
                end_date:end_date,
                budget_year:budget_year,
                title:title,
                company_code:company_code,
                total_budget:numeral(total_budget).format('0,0'),
                mechanism:mechanism,
                kpi:kpi,
                objective:objective,
                background:background,
                eksekutor:detailseksekutor,
                approval:detailapproval,
                budget:detailbudget,
                nama_approval:nama_approval,
                proposal_no:proposal_no,
                status:status_deskripsi,
                bgcolor:bgcolor,
                nama_createdby:createdproposal,
                status_deskripsi_createdby:status_deskripsi_createdby,
                logo:logo,
                baseurl:direktoricetak(),
      
            }
              
            if(dataemail.length > 0){
                let dataemaildev = [];
                //dataemail.push('tiasadeputra@gmail.com');
                //dataemail.push('ilyas.nurrahman@gmail.com');

                dataemaildev.push('ilyas.nurrahman@gmail.com');
                dataemaildev.push('itdev.trial@enesis.com');
                dataemaildev.push('tiasadeputra@gmail.com');


                dataemail = dataemail.filter(e => e !== 'johnny.katio@enesis.com');

                let templateProposalAll = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'emailall', templateparam: paramEmailAll}); 
                SendEmail(dataemail.toString(), paramEmailAll.subject, templateProposalAll,null,'EPROP');
            }
              
  
          }

    
    } catch (err) {
        
        return err;
      
    }
    
    

}



function _generateDataEksekutor(table) {
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
            content = content + `<tr>`
            content = content + addRowSpan("nomor", i, false,"center")
            content = content + addRowSpan("employee_id", i, false,"left")
            content = content + addRowSpan("name", i, false, "left")
            content = content + `</tr>`
        }
  
        return content
    }
    
    return '<tr><td>No Data</td></tr>'
  }
  
  
  function _generateDataBudget(table) {
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
            content = content + `<tr>`
            content = content + addRowSpan("nomor", i, false,"center")
            content = content + addRowSpan("division", i, false,"left")
            content = content + addRowSpan("periode", i, false,"left")
            content = content + addRowSpan("branch", i, false,"left")
            content = content + addRowSpan("brand", i, false, "left")
            content = content + addRowSpan("activity", i, false, "left")
            content = content + addRowSpan("budget", i, false, "left")
            content = content + `</tr>`
        }
  
        return content
    }
    
    return '<tr><td>No Data</td></tr>'
  }
  
  
  function _generateDataApproval(table) {
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
            content = content + `<tr>`
            content = content + addRowSpan("nomor", i, false,"center")
            content = content + addRowSpan("name", i, false,"left")
            content = content + addRowSpan("position_appr", i, false,"left")
            content = content + addRowSpan("status_approval_desc", i, false, "left")
            content = content + `</tr>`
        }
  
        return content
    }
    
    return '<tr><td>No Data</td></tr>'
  }
  
  
  function base64_encode(file) {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
  }

  function convertBulan(bulan){

    let periode =  ``;
    if(bulan==1){
      periode='Januari';
    }else if(bulan==2){
      periode='Februari';
    }else if(bulan==3){
      periode='Maret';
    }else if(bulan==4){
      periode='April';
    }else if(bulan==5){
      periode='Mei';
    }else if(bulan==6){
      periode='Juni';
    }else if(bulan==7){
      periode='Juli';
    }else if(bulan==8){
      periode='Agustus';
    }else if(bulan==9){
      periode='September';
    }else if(bulan==10){
      periode='Oktober';
    }else if(bulan==11){
      periode='November';
    }else if(bulan==12){
      periode='Desember';
    }
  
    return periode;
  
  }