const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
const path = require('path');
const numeral = require('numeral');
const puppeteer = require('puppeteer')
const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'logbook');

module.exports = {


  // GET ALL RESOURCE
  generate: async function (req, res) {
    req.setTimeout(2080000);
    const {
      query: {doc_no,brand_code,division_code,
        approve_start_date,budget_year,activity_code,
        approve_end_date,company_code,last_approve,
        created_start,created_end,
        status_id,bulan
        }
    } = req;

    try {
      const request = await DBPROP.promise();
      const requestEsales = DB.pool.request();

  
      let whereClause = ``;


      let bulan_arr = "";
      if(bulan){
        if(bulan.length > 0){
          for (const datas of bulan) {
            bulan_arr += ",'" + datas + "'"
          }
          bulan_arr = bulan_arr.substring(1);
  
          whereClause += `AND bulan IN (${bulan_arr})`;
  
        }
      }


      if(doc_no){
          
          whereClause +=` AND doc_no ='${doc_no}'`;
      }
  
  
      if(brand_code){
          whereClause += ` AND brand_code ='${brand_code}'`;
      }
  
      if(division_code){
          
          whereClause += ` AND division_code ='${division_code}'`;
      }
      
  
      if(budget_year){
          
        if(budget_year==2020){
          whereClause += ` AND c.active = 0`;
        }
        whereClause += ` AND budget_year ='${budget_year}'`;
      }
  
      if(activity_code){
          
          whereClause += ` AND activity_code ='${activity_code}'`;
      }
  
      if(approve_start_date && approve_end_date){
          let startdate = moment(approve_start_date,'YYYY-MM-DD').format('YYYY-MM-DD');
          let enddate = moment(approve_end_date,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND last_approve BETWEEN '${startdate}' AND '${enddate}'`;
      }
  
      if(created_start && created_end){
          let startdate = moment(created_start,'YYYY-MM-DD').format('YYYY-MM-DD');
          let enddate = moment(created_end,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND proposal_date BETWEEN '${startdate}' AND '${enddate}'`;
      }
  
  
      if(company_code){
  
          whereClause += ` AND company_code ='${company_code}'`;
      }
  
      if(last_approve){
          let lastapprove = moment(last_approve,'YYYY-MM-DD').format('YYYY-MM-DD');
          whereClause += ` AND last_approve ='${lastapprove}'`;
      }
      
      if(status_id){
          whereClause += ` AND status_id ='${status_id}'`;
      }
      
      
      let active = 0;
      if(budget_year==2020){
        active = 0;
      }else{
        active = 1;
      }
  
      let queryDataTable = `SELECT DISTINCT company_code, 
      division_code, branch_desc, 
      brand_code, doc_no, DATE_FORMAT(proposal_date, "%Y-%m-%d") AS proposal_date, 
      title, budget_year, budget, status_name, a.activity_code, 
      a.activity_desc, DATE_FORMAT(start_date, "%Y-%m-%d") AS start_date, DATE_FORMAT(end_date, "%Y-%m-%d") AS end_date, 
      brand_text, status_id, 
      a.activity_id, DATE_FORMAT(a.created_date, "%Y-%m-%d") AS created_date , 
      DATE_FORMAT(last_approve, "%Y-%m-%d") AS last_approve, outlet,
      COALESCE(b.created_date,'') as reject_date,
      COALESCE(b.updated_by,'') as reject_by,
      COALESCE(comment,'') as alasan,
      a.proposal_budget_id AS budget_id,
      c.group_name
      FROM vw_logbook a 
      left join history_appr b on a.proposal_id = b.proposal_id and b.status_approval_id = 3
      LEFT JOIN activity c ON (a.activity_id = c.activity_code AND c.active= CASE WHEN a.budget_year=2020 THEN 0 ELSE 1 END)
      WHERE 1=1 ${whereClause} `;


      let [rows, fields] = await request.query(queryDataTable)


        let budgetid = rows.map(function(item) {
            return item['budget_id'];
          });
    
         
    
          let budgetuniqid = _.uniq(budgetid);
          let valueINBudgetId = "";
          for (const datas of budgetuniqid) {
            valueINBudgetId += ",'" + datas + "'";
          }
          valueINBudgetId = valueINBudgetId.substring(1);
    
          let sel = `select b.nomor_proposal,nomor_klaim,sum(b.total_klaim) as total,c.nama,c.channel, 
          CAST(b.budget_id AS bigint) AS budget_id
          from klaim a
          inner join klaim_detail b on a.klaim_id = b.klaim_id
          left join m_distributor_v c on c.m_distributor_id = a.m_distributor_id
          where a.isactive = 'Y'
          and b.budget_id IN(${valueINBudgetId})
          group by b.nomor_proposal,nomor_klaim,c.nama,c.channel,CAST(b.budget_id AS bigint)`;
          
          let dt = await requestEsales.query(sel);
    
          for (let i = 0; i < dt.recordset.length; i++) {
            dt.recordset[i].budget_id= Number(dt.recordset[i].budget_id);
          }
      
            let datarows = [];
              for (let i = 0; i < rows.length; i++) {
      
      
                let dataklaim = dt.recordset.filter( e => e.budget_id == rows[i].budget_id);
      
                let totalklaim = 0;
                let nomor_klaim = '';
                let distributor = '';
                let channel = '';
      
                if(dataklaim.length > 0){
                  totalklaim = dataklaim[0].total;
                  nomor_klaim = dataklaim[0].nomor_klaim;
                  distributor = dataklaim[0].nama;
                  channel = dataklaim[0].channel;
                }
      
                let obj = 
                {
                  no : i+1,
                  company_code: rows[i].company_code,
                  division_code: rows[i].division_code,
                  branch_desc: rows[i].branch_desc,
                  brand_code: rows[i].brand_code,
                  doc_no: rows[i].doc_no,
                  proposal_date: rows[i].proposal_date,
                  title: rows[i].title,
                  budget_year: rows[i].budget_year,
                  budget: rows[i].budget,
                  status_name: rows[i].status_name,
                  activity_code: rows[i].activity_code,
                  activity_desc: rows[i].activity_desc,
                  start_date: rows[i].start_date,
                  end_date: rows[i].end_date,
                  brand_text: rows[i].brand_text,
                  status_id: rows[i].status_id,
                  activity_id: rows[i].activity_id,
                  created_date: rows[i].created_date,
                  last_approve: rows[i].last_approve,
                  outlet: rows[i].outlet,
                  reject_date: rows[i].reject_date,
                  reject_by: rows[i].reject_by,
                  alasan: rows[i].alasan,
                  budget_id: rows[i].budget_id,
                  totalklaim:totalklaim,
                  nomor_klaim:nomor_klaim,
                  distributor:distributor,
                  channel:channel,
                  group_name:rows[i].group_name
                }
                
                datarows.push(obj);
      
              }
        

      let details = _generateTable(datarows);
      let logo = `data:image/jpeg;base64,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`;
      if(datarows.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'logbook_'.concat(tglfile).concat('.pdf');          
        
        let paramHtml = {
            
            baseurl:direktoricetak(),
            logo:logo,
            list:details
        }

          let heightmargin = datarows.length + 50;
          let finalHtml = await sails.helpers.generateHtmlCetakLogbook.with({ htmltemplate: 'index', templateparam: paramHtml}); 
          const browser = await puppeteer.launch({ headless: true })
          const page = await browser.newPage();
          await page.setContent(finalHtml);
          // eslint-disable-next-line no-undef
          let height = await page.evaluate(() => document.documentElement.offsetHeight);
          let width = await page.evaluate(() => document.documentElement.offsetWidth);
          const buffer = await page.pdf({
            height: `${height+50}px`,
            width: `${width+50}px`,
            printBackground: true,
            landscape:false,
            
        })
        await browser.close();
        res.setHeader('Content-Type', 'application/octet-stream' ); //'application/vnd.openxmlformats'
        res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
        res.contentType(`application/pdf`);
        res.send(buffer);

       


        


    }else{

        return res.error({
          message: "Data tidak ada"
        });

      }
      
    } catch (err) {
      return res.error(err);
    }
  },
 


}



function _generateTable(table) {
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
            content = content + addRowSpan("no", i, false, "center")
            content = content + addRowSpan("company_code", i, false, "left")
            content = content + addRowSpan("division_code", i, false, "left")
            content = content + addRowSpan("branch_desc", i, false, "left")
            content = content + addRowSpan("doc_no", i, false, "left")
            content = content + addRowSpan("proposal_date", i, false, "left")
            content = content + addRowSpan("title", i, false, "left")
            content = content + addRowSpan("bulan_desc", i, false, "left")
            content = content + addRowSpan("budget_year", i, false, "right")
            content = content + addRowSpan("budget", i, false, "right")
            content = content + addRowSpan("status_name", i, false, "left")
            content = content + addRowSpan("activity_code", i, false, "left")
            content = content + addRowSpan("activity_desc", i, false, "left")
            content = content + addRowSpan("brand_text", i, false, "left")
            content = content + addRowSpan("last_approve", i, false, "left")
            content = content + addRowSpan("outlet", i, false, "left")
            content = content + `</tr>`
        }
  
        return content
    }
    
    return '<tr><td>No Data</td></tr>'
  }