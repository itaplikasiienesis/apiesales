const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const DBPROP = require("../../services/DBPROPOSAL");
const moment = require('moment');
const json2xls = require('json2xls');

module.exports = {
    find: async function(req, res) {
        const {
          query: { currentPage, pageSize }
        } = req;
    
        const requesteprop = await DBPROP.promise();
        await DB.poolConnect;
        try {

            const request = DB.pool.request();
    
            let queryDataTable = `SELECT * FROM proposal WHERE status_id IN (10,20) AND budget_year = 2021`;

            let dataproposal = await requesteprop.query(queryDataTable);
            let rows = dataproposal[0];

            let datatemuanapproval = [];
            let posisiapproval = [];
            for (let i = 0; i < rows.length; i++) {
                    
                let proposal_id = rows[i].proposal_id;
                console.log('proposal_id ',i);

                let chekposisiPending = `SELECT pa.*,e.name FROM proposal_approval pa,employee e 
                WHERE pa.proposal_id = '${proposal_id}' AND pa.flag=1 
               AND e.employee_id =pa.employee_id  ORDER BY pa.no_appr`;
                let dataposisi = await requesteprop.query(chekposisiPending);
                let posisi = dataposisi[0];
                let chekposisiWaiting = `SELECT pa.*,e.name FROM proposal_approval pa,employee e 
                WHERE pa.proposal_id = '${proposal_id}' AND pa.flag=0 
               AND e.employee_id =pa.employee_id  ORDER BY pa.no_appr`;
                let datawaiting = await requesteprop.query(chekposisiWaiting);
                let waiting = datawaiting[0];

                if(posisi.length==0 && waiting.length > 0){
                    console.log('ada temuan');
                    console.log(proposal_id);

                    datatemuanapproval.push({
                        proposal_id:proposal_id                        
                    })
                }else{
                    rows[i].posisi_approval = posisi[0].name;
                }
            
            }


            if(datatemuanapproval.length > 0){
                return res.error({
                    message: datatemuanapproval.toString()
                });
            }else{


            let arraydetailsforexcel = [];
            for (let i = 0; i < rows.length; i++) {
               
                    if(rows[i].user_type){

                        rows[i].roles = rows[i].user_type;
                    }
                delete rows[i].username_eprop;
                delete rows[i].user_type;

                let obj = {
                    "Proposal No": rows[i].doc_no,
                    "Approval Pending":rows[i].posisi_approval,

                }

                arraydetailsforexcel.push(obj);


            }


            if(arraydetailsforexcel.length > 0){
                let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
                let namafile = 'proposal_pending_approval_'.concat(tglfile).concat('.xlsx');          
                var hasilXls = json2xls(arraydetailsforexcel);
                res.setHeader('Content-Type', "application/vnd.ms-excel"); //'application/vnd.openxmlformats'
                res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
                res.end(hasilXls, 'binary');
              
            }else{
        
                return res.error({
                  message: "Data tidak ada"
                });
        
              }
            

            }


        } catch (err) {
          return res.error(err);
        }
      },
}