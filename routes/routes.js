const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
const poolreplika = require('../database.js')
const poolworkflow = require('../database2.js')
var nodemailer = require('nodemailer')
const mustache = require('mustache')
var smtpTransport = require('nodemailer-smtp-transport');
const fs = require('fs');
var sql = require('mssql')
const crypto = require('crypto')

//const { func } = require('../netlify/functions/dbusingpgpromise.js');
const router = express.Router();
const KEY_TOKEN = process.env.SECRETTOKEN
const USE_DB = process.env.USEDB;
const FOLLOWLINK = process.env.FOLLOWLINK

console.log("USEDB: " + USE_DB)
console.log(KEY_TOKEN)

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ikeltiga@gmail.com',
    //pass: 'Isupportkelompok32'
    pass: 'ewxsofcnulplgjhn'
  }
});

var mailOptions = {
  from: 'isupport-kelompok3',
  to: 'alipanwar@yahoo.com',
  subject: 'Sending Email using Node.js',
  text: 'That was easy!'
};

var relaytransporter = nodemailer.createTransport(smtpTransport({
  host: '10.0.0.112',
  port: 25,
  tls: {
    rejectUnauthorized: false, // do not fail on invalid certs
  }
}));

router.get('/workflowtl/genhash/:user', async function (req, res) {
  let luser = req.params.user
  let salt = bcrypt.genSalt()
  console.log(luser);
  res.status(200).json({ user: luser });
});

router.post('/workflowtl/testsmtprelay', async function (req, res) {

  const payload = req.body
  const template = fs.readFileSync('templatesales.html', 'utf8');
  const mailOptions = {
    from: 'ict@bahana.co.id',
    to: 'anwar.raharja@bahana.co.id',
    subject: 'Sending Email using Node.js',
    html: mustache.render(template, { ...payload })
  };
  relaytransporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.json({ status: "ERR", message: error })
    } else {
      console.log('Email sent: ' + info.response);
      res.json({ status: "OK", message: info.response })
    }
  });
});

router.get('/workflowtl/followlink/:token', async function (req, res) {

  console.log("followlink")
  const { token } = req.params
  const workflow = await poolworkflow.connect();
  //const workflow2 = await poolworkflow.connect();
  try {
    let result = await workflow.query('select * from followlinktoken where followlinktoken=$1', [token])
    console.log(result)
    if (result.rowCount > 0) {
      if (result.rows[0].userrole === 'SALES') {

        const body = req.body;
        const prole = 'SALES'
        const luserid = result.rows[0].userid
        const lusername = result.rows[0].username
        const lemail = result.rows[0].email
        const lticketid = result.rows[0].ticketid
        const lstatus = "A"
        const lsales_id = "A"
        console.log(luserid + " " + lusername + " " + " " + lemail + " " + lticketid + " " + lstatus + " " + lsales_id)
        const ptoken = jwt.sign({ user: body }, KEY_TOKEN);

        retval = {
          result: "OK", message: "Login OK", user_id: luserid, role: prole,
          user_name: lusername, email_address: lemail, userstatus: lstatus,
          sales_id: lsales_id, token: ptoken, ticketid: lticketid, refftoken: token
        }
        workflow.release()
        console.log(retval)
        return res.status(200).json(retval);
      }
      else {
        console.log(result.rows[0].val);
        const luserid = result.rows[0].userid
        const lusername = result.rows[0].username
        const lemail = result.rows[0].email
        const lrole = result.rows[0].userrole
        const lticketid = result.rows[0].ticketid
        const body = { luserid };
        const ptoken = jwt.sign({ user: body }, KEY_TOKEN);
        workflow.release()
        return res.status(200).json({
          result: "OK", message: "Login OK", userid: luserid, role: lrole,
          username: lusername, email: lemail,
          token: ptoken, ticketid: lticketid, refftoken: token
        });
      }
    }
    else {
      retval = {
        result: "FAILED", message: "Follow Link Expired"
      }
    }

    workflow.release()
    return res.status(200).json(retval)
  }
  catch (error) {
    console.log("ERR " + error)
    workflow.release()
    return res.status(500).json(error)
  }
});



router.get('/workflowtl/', (req, res) => {
  res.json({ status: "OK called from root" });
})

router.get('/workflowtl/tesmssql', async (req, res) => {

  try {
    var sql = require('mssql')
    const config = {
      user: 'sa',
      password: 'Bahanabs01$@26',
      server: '192.168.10.26', // e.g., 'localhost'
      database: 'WORKFLOW_TRADINGLIMIT',
      options: {
        encrypt: true, // Use encryption
        trustServerCertificate: true // Change to true for local dev / self-signed certs
      }
    };
    let pool = await sql.connect(config)
    let request = pool.request()
    let from = 'ict@bahana.co.id'
    let to = 'anwar.raharja@bahana.co.id;alipanwar@gmail.com'
    let subject = 'test mail'
    let content = 'test mail content'
    let flag = 0
    request.input('from', sql.NVarChar, from)
    request.input('to', sql.NVarChar, to)
    request.input('subject', sql.NVarChar, subject)
    request.input('content', sql.NVarChar, content)
    request.input('flag', sql.Bit, flag)
    let querystr = `insert into mail(from, to, subject, content, instime, flag) values ('${from}', '${to}', '${subject}', '${content}', CURRENT_TIMESTAMP, ${flag}})`
    console.log(querystr)
    let result = await request.query('insert into mail([from], [to], [subject], [content], [instime], [flag]) values (@from, @to, @subject, @content, CURRENT_TIMESTAMP, @flag)')
    console.log(result)
    pool.close()
    return res.status(200).json(result)
  }
  catch (err) {
    console.error('Database connection error: ', err)
    return res.status(500).json(err)
  }

});


router.get('/workflowtl/test', function (request, response) {
  response.sendFile('tes.html', { root: __dirname });
});

router.get('/workflowtl/testmail', function (request, res) {

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      res.json({ status: "ERR", message: error })
    } else {
      console.log('Email sent: ' + info.response);
      res.json({ status: "OK", message: info.response })
    }
  });

});

router.get('/workflowtl/cekdb', async function (request, res) {

  const client = await pool.connect()
  try {
    return res.status(200).json(client);
  }
  catch (e) {
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});

router.get('/workflowtl/new', function (request, response) {
  response.sendFile('new.html', { root: __dirname });
});

router.get('/workflowtl/listticketbyuser/:user', async (req, res) => {

  let puser = req.params.user;
  console.log(puser)
  const workflow = await poolworkflow.connect();
  try {
    workflow.query('select * from tickets where user_id=$1', [puser], (err, result) => {
      if (err) {
        console.log(err)
      }
      else {
        if (result.rowCount > 0) {
          // send records as a response
          console.log(result.rows[0].id)
          console.log(result.rows[0].custcode)
          console.log(result.rows[0].custname)
          console.log(result.rows[0].tradinglimit)
          console.log(result.rows[0].email)
          res.status(200).json(result.rows);
        }
        else {
          //res.status(200).json({ empty : "empty record"})
          res.status(200).json(result.rows);
        }
      }
    })
  }
  catch (e) {
    console.log.err(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});

router.get('/workflowtl/listticketbysales/:salesid', async (req, res) => {

  let psalesid = req.params.salesid;
  console.log(psalesid)
  const workflow = await poolworkflow.connect();
  try {
    workflow.query('select * from tickets where sales_id=$1 and waiting_for=$2 and status=1', [psalesid, "SALES"], (err, result) => {
      if (err) {
        console.log(err)
      }
      else {
        if (result.rowCount > 0) {
          // send records as a response
          console.log(result.rows[0].id)
          console.log(result.rows[0].custcode)
          console.log(result.rows[0].custname)
          console.log(result.rows[0].tradinglimit)
          console.log(result.rows[0].email)
          res.status(200).json(result.rows);
        }
        else {
          //res.status(200).json({ empty : "empty record"})
          res.status(200).json(result.rows);
        }
      }
    })
  }
  catch (e) {
    console.log.err(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});

router.post('/workflowtl/nasabahlogin', async function (req, res) {
  let puser = req.body.user;
  let ppassword = req.body.password;
  console.log(puser + ', ' + ppassword)
  const replika = await poolreplika.connect();
  try {
    console.log("db connected")
    replika.query('select user_id, crypt($1, hash_password)=hash_password val, user_name, email_address, status from users where user_id = $2', [ppassword, puser], (err, result) => {
      if (err) {
        console.log("error")
      }
      else {
        if (result.rowCount > 0) {
          console.log(result.rows[0].val);
          if (result.rows[0].val == true) {
            console.log("signon " + puser + " result is true")
            console.log('User [' + puser + '] has logged in.');
            const body = req.body;
            const ptoken = jwt.sign({ user: body }, KEY_TOKEN);
            replika.release()
            const prole = 'NASABAH'
            replika.query('select custcode,custname,sid,custstatus,approvelimit from customer where user_id=$1', [puser], (err2, result2) => {
              if (err2) {
                console.log("error2")
              }
              else {
                if (result2.rowCount > 0) {
                  const luserid = result.rows[0].user_id
                  const lusername = result.rows[0].user_name
                  const lemail = result.rows[0].email_address
                  const lstatus = result.rows[0].status
                  const lcustcode = result2.rows[0].custcode
                  const lcustname = result2.rows[0].custname
                  const lsid = result2.rows[0].sid
                  const lcuststatus = result2.rows[0].custstatus
                  const lapprovelimit = result2.rows[0].approvelimit
                  replika.release
                  return res.status(200).json({
                    result: "OK", message: "Login OK", user_id: luserid, role: prole,
                    user_name: lusername, email_address: lemail, userstatus: lstatus,
                    custcode: lcustcode, custname: lcustname, sid: lsid, custstatus: lcuststatus,
                    approvelimit: lapprovelimit, token: ptoken
                  });
                }
                else {
                  console.log("Error on customer validation");
                  replika.release()
                  return res.status(200).json({ result: "Not Ok", message: "Error on customer validation" });
                }
              }
            })
          }
          else {
            console.log("Error on password validation");
            replika.release()
            return res.status(200).json({ result: "Not Ok", message: "Error on password validation" });
          }
        }
        else {
          console.log("Invalid userid or password");
          replika.release()
          return res.status(200).json({ result: "Not Ok", message: "Invalid userid or password" });
        }
      }
    })
  }
  catch (e) {
    console.log.err(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});

router.post('/workflowtl/saleslogin', async function (req, res) {
  let puser = req.body.user;
  let ppassword = req.body.password;
  console.log(puser + ', ' + ppassword)
  const replika = await poolreplika.connect();
  //const replika = await poolworkflow.connect();
  try {
    console.log("db connected")
    //replika.query('select user_id, crypt($1, hash_password)=hash_password val, user_name, email_address, status from users where user_id = $2', [ppassword, puser], (err, result) => {
    replika.query('select a.user_id, crypt($1, a.hash_password)=a.hash_password val, a.user_name, a.email_address, a.status, b.sales_id from users a inner join sales b on a.user_id=b.user_id where a.user_id = $2', [ppassword, puser], (err, result) => {
      //tabel sales dan users di workflow
      //replika.query('select a.user_id, crypt($1, a.hash_password)=a.hash_password val, a.user_name, a.email_address, a.status, b.sales_id from users_dxtrade a inner join sales b on a.user_id=b.user_id where a.user_id = $2', [ppassword, puser], (err, result) => {
      if (err) {
        console.log("error")
        console.log(err)
      }
      else {
        if (result.rowCount > 0) {
          console.log(result.rows[0].val);
          if (result.rows[0].val === true) {
            console.log("signon " + puser + " result is true")
            console.log('User [' + puser + '] has logged in.');
            const body = req.body;
            const prole = 'SALES'
            const luserid = result.rows[0].user_id
            const lusername = result.rows[0].user_name
            const lemail = result.rows[0].email_address
            const lstatus = result.rows[0].status
            const lsales_id = result.rows[0].sales_id
            console.log(luserid + " " + lusername + " " + " " + lemail + " " + lstatus + " " + lsales_id)
            const ptoken = jwt.sign({ user: body }, KEY_TOKEN);
            replika.release
            return res.status(200).json({
              result: "OK", message: "Login OK", user_id: luserid, role: prole,
              user_name: lusername, email_address: lemail, userstatus: lstatus,
              sales_id: lsales_id, token: ptoken
            });
          }
          else {
            console.log("Error on password validation");
            replika.release()
            return res.status(200).json({ result: "Not Ok", message: "Error on password validation" });
          }
        }
        else {
          console.log("Invalid userid or password");
          replika.release()
          return res.status(200).json({ result: "Not Ok", message: "Invalid userid or password" });
        }
      }
    })
  }
  catch (e) {
    console.log.err(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});
/*
router.post('/workflowtl/nasabahlogin', async function (req, res) {
  let puser = req.body.user;
  let ppassword = req.body.password;
  console.log(puser + ', ' + ppassword)
  const replika = await poolreplika.connect();
  try {
    console.log("db connected")
    replika.query('select user_id, crypt($1, hash_password)=hash_password val, user_name, email_address, status from users where user_id = $2', [ppassword, puser], (err, result) => {
      if (err) {
        console.log("error")
      }
      else {
        if (result.rowCount > 0) {
          console.log(result.rows[0].val);
          if (result.rows[0].val == true) {
            console.log("signon " + puser + " result is true")
            console.log('User [' + puser + '] has logged in.');
            const body = req.body;
            const ptoken = jwt.sign({ user: body }, KEY_TOKEN);
            replika.release()
            const prole = 'NASABAH'
            replika.query('select custcode,custname,sid,custstatus from customer where user_id=$1', [puser], (err2, result2) => {
              if (err2) {
                console.log("error2")
              }
              else {
                if (result2.rowCount > 0) {
                  const luserid = result.rows[0].user_id
                  const lusername = result.rows[0].user_name
                  const lemail = result.rows[0].email_address
                  const lstatus = result.rows[0].status
                  const lcustcode = result2.rows[0].custcode
                  const lcustname = result2.rows[0].custname
                  const lsid = result2.rows[0].sid
                  const lcuststatus = result2.rows[0].custstatus
                  replika.release
                  return res.status(200).json({
                    result: "OK", message: "Login OK", user_id: luserid, role: prole,
                    user_name: lusername, email_address: lemail, userstatus: lstatus,
                    custcode: lcustcode, custname: lcustname, sid: lsid, custstatus: lcuststatus,
                    token: ptoken
                  });
                }
                else {
                  console.log("Error on customer validation");
                  replika.release()
                  return res.status(200).json({ result: "Not Ok", message: "Error on customer validation" });
                }
              }
            })
          }
          else {
            console.log("Error on password validation");
            replika.release()
            return res.status(200).json({ result: "Not Ok", message: "Error on password validation" });
          }
        }
        else {
          console.log("Invalid userid or password");
          replika.release()
          return res.status(200).json({ result: "Not Ok", message: "Invalid userid or password" });
        }
      }
    })
  }
  catch (e) {
    console.log.err(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});
*/
router.post('/workflowtl/nonnasabahlogin', async function (req, res) {
  let puser = req.body.user;
  let ppassword = req.body.password;
  //console.log(puser + ', ' + ppassword)
  const workflow = await poolworkflow.connect();
  try {
    workflow.query('select userid, crypt($1, password)=password val, username, email, roleuser from users where userid = $2', [ppassword, puser], (err, result) => {
      if (err) {
        console.log("error " + err)
      }
      else {
        if (result.rowCount > 0) {
          const body = req.body;
          const ptoken = jwt.sign({ user: body }, KEY_TOKEN);
          console.log(result.rows[0].val);
          const luserid = result.rows[0].userid
          const lusername = result.rows[0].username
          const lemail = result.rows[0].email
          const lrole = result.rows[0].roleuser
          workflow.release
          return res.status(200).json({
            result: "OK", message: "Login OK", userid: luserid, role: lrole,
            username: lusername, email: lemail,
            token: ptoken
          });
        }
        else {
          console.log("Invalid userid or password");
          workflow.release()
          return res.status(200).json({ result: "Not Ok", message: "Invalid userid or password" });
        }
      }
    })
  }
  catch (e) {
    console.log.err(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});

router.get('/workflowtl/customerportfolio/:custcode', verifyToken, async (req, res, next) => {

  try {
    const client = await poolreplika.connect()
    const custcode = req.params.custcode

    //client.query("select * from customer a inner join account b on a.custcode=b.base_account_no left join stock_last_price c on b.asset_code=c.stock_code left join stock_haircut d on b.asset_code=d.stock_code where a.custcode=$1 and b.account_type in ('P', 'C') order by b.asset_code", [custcode], function (err, result) {
    client.query("select base_account_no,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as liquidityvalue from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' group by base_account_no", [custcode], function (err, result) {
      if (err) {
        client.release()
        return res.status(401).json({ result: "ERR", message: "Unauthorized" });
      }
      if (result.rowCount > 0) {
        client.release()
        return res.status(200).json(result.rows[0]);
      }
      else {
        client.release()
        return res.status(200).json("");
      }
    })
  }
  catch (e) {
    return res.status(500).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/customerasset/:custcode', verifyToken, async (req, res, next) => {

  try {
    const client = await poolreplika.connect()
    const custcode = req.params.custcode

    //client.query("select * from customer a inner join account b on a.custcode=b.base_account_no left join stock_last_price c on b.asset_code=c.stock_code left join stock_haircut d on b.asset_code=d.stock_code where a.custcode=$1 and b.account_type in ('P', 'C') order by b.asset_code", [custcode], function (err, result) {
    client.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'"
      , [custcode, custcode], function (err, result) {
        if (err) {
          client.release()
          return res.status(401).json({ result: "ERR", message: "Unauthorized" });
        }
        if (result.rowCount > 0) {
          client.release()
          let retval = new Object();
          retval.cashbalance = "0"
          retval.liquidityvalue = "0";
          for (let i = 0; i < result.rowCount; i++) {
            if (result.rows[i].tag === 'CashBalance') {
              retval.cashbalance = result.rows[i].val;
            }
            if (result.rows[i].tag === 'LiquidityValue') {
              retval.liquidityvalue = result.rows[i].val;
            }
          }
          console.log(retval)
          return res.status(200).json(retval);
        }
        else {
          client.release()
          return res.status(200).json("");
        }
      })
  }
  catch (e) {
    return res.status(500).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/customertrxhistory/:custcode', verifyToken, async (req, res, next) => {

  try {
    const client = await poolreplika.connect()
    const custcode = req.params.custcode

    //client.query("select * from customer a inner join account b on a.custcode=b.base_account_no left join stock_last_price c on b.asset_code=c.stock_code left join stock_haircut d on b.asset_code=d.stock_code where a.custcode=$1 and b.account_type in ('P', 'C') order by b.asset_code", [custcode], function (err, result) {
    client.query("select ROW_NUMBER() OVER(ORDER BY trade_date desc) as id, trade_date, symbol, case when side='1' then 'B' when side='2' then 'S' end as side,trade_qty, price::bigint as price, symbol_sfx From trades_hist where base_account_no=$1 and trade_date > 'now'::timestamp - '1 month'::interval order by trade_date desc", [custcode], function (err, result) {
      if (err) {
        client.release()
        return res.status(401).json({ result: "ERR", message: "Unauthorized" });
      }
      if (result.rowCount > 0) {
        client.release()
        return res.status(200).json(result.rows);
      }
      else {
        client.release()
        return res.status(200).json("");
      }
    })
  }
  catch (e) {
    return res.status(500).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/customerdata/:custcode', verifyToken, async (req, res, next) => {

  try {
    const client = await poolreplika.connect()
    const custcode = req.params.custcode

    //client.query("select * from customer a inner join account b on a.custcode=b.base_account_no left join stock_last_price c on b.asset_code=c.stock_code left join stock_haircut d on b.asset_code=d.stock_code where a.custcode=$1 and b.account_type in ('P', 'C') order by b.asset_code", [custcode], function (err, result) {
    client.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        client.release()
        return res.status(401).json({ result: "ERR", message: "Unauthorized" });
      }
      if (result.rowCount > 0) {
        client.release()
        return res.status(200).json(result.rows[0]);
      }
      else {
        client.release()
        return res.status(200).json("");
      }
    })
  }
  catch (e) {
    return res.status(500).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/customerdatasummary/:custcode', verifyToken, async (req, res, next) => {

  try {
    const client = await poolreplika.connect()
    const custcode = req.params.custcode
    client.query("select * from customer a inner join account b on a.custcode=b.base_account_no left join stock_last_price c on b.asset_code=c.stock_code left join stock_haircut d on b.asset_code=d.stock_code where a.custcode=$1 and b.account_type in ('P', 'C') order by b.asset_code", [custcode], function (err, result) {
      if (err) {
        client.release()
        return res.status(401).json({ result: "ERR", message: "Unauthorized" });
      }
      if (result.rowCount > 0) {
        client.release()
        for (var i = 0; i < result.rowCount; ++i) {
          console.log(result.rows[i].asset_code);
        }
        return res.status(200).json(result.rows);
      }
      else {
        client.release()
        return res.status(200).json("");
      }
    })
  }
  catch (e) {
    return res.status(500).json({ result: "ERR", message: e.message })
  }
});

function verifyToken(req, res, next) {

  console.log(req.headers)
  try {
    const bearerHeader = req.headers['authorization']
    console.log(bearerHeader)
    if (typeof bearerHeader !== 'undefined') {
      const bearer = bearerHeader.split(' ')
      const bearerToken = bearer[1]
      //req.token = bearerToken
      jwt.verify(bearerToken, KEY_TOKEN, (err, valid) => {
        if (err) {
          console.log("get /users verify err")
          return res.status(403).json({ result: "ERR", message: "Forbidden" })
        }
      })
      next()
    }
    else {
      console.log("verifyToken else")
      return res.status(403).json({ Status: "ERR", message: "Invalid token" })
    }
  }
  catch (e) {
    console.log("verifyToken exception catch")
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
}

async function requestMail(mailOptions) {

  try {
    console.log('requestMail ' + mailOptions)
    const config = {
      user: 'sa',
      password: 'Bahanabs01$@26',
      server: '192.168.10.26', // e.g., 'localhost'
      database: 'WORKFLOW_TRADINGLIMIT',
      options: {
        encrypt: true, // Use encryption
        trustServerCertificate: true // Change to true for local dev / self-signed certs
      }
    };
    console.log(mailOptions)
    let pool = await sql.connect(config)
    let request = pool.request()
    let from = mailOptions.from
    let to = mailOptions.to
    let subject = mailOptions.subject
    let content = mailOptions.html
    let flag = 0

    request.input('from', sql.NVarChar, from)
    request.input('to', sql.NVarChar, to)
    request.input('subject', sql.NVarChar, subject)
    request.input('content', sql.NVarChar, content)
    request.input('flag', sql.Bit, flag)
    let querystr = `insert into mail(from, to, subject, content, instime, flag) values ('${from}', '${to}', '${subject}', '${content}', CURRENT_TIMESTAMP, ${flag}))`
    console.log(querystr)
    let result = await request.query('insert into mail([from], [to], [subject], [content], [instime], [flag]) values (@from, @to, @subject, @content, CURRENT_TIMESTAMP, @flag)')
    console.log(result)
    pool.close()
  }
  catch (err) {
    console.error('Database connection error: ', err)
  }
}


async function createAuditTrail(ticket_id, status, notes, userid) {

  console.log("createAuditTrail " + ticket_id + " " + status + " " + notes + " " + userid)
  const workflow = await poolworkflow.connect()
  workflow.query("INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)",
    [ticket_id, status, notes, userid], (err, result) => {
      if (err) {
        console.log('err' + err)
      }
      workflow.release()
    })
}

async function sendCreateEmailToSales(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, sales_id, sales_name, sales_user_id, sales_email, status, user_id) {

  try {
    console.log("sendCreateEmailToSales " + ticketid + " " + name + " " + waiting_for + " " + custcode + " " + requestedapprovelimit + "...")
    const template = fs.readFileSync('templatesales.html', 'utf8');
    const replika = await poolreplika.connect();
    const workflow = await poolworkflow.connect()

    replika.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.rowCount > 0) {
        let res = new Object()
        res.custcode = result.rows[0].custcode
        res.sid = result.rows[0].sid
        res.opendate = result.rows[0].opendate
        res.approvelimit = result.rows[0].approvelimit
        console.log("data_customer")
        replika.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'", [custcode, custcode], async function (err2, result2) {
          if (err2) {
            console.log(err)
          }
          if (result2.rowCount > 0) {
            res.cashbalance = "0"
            res.liquidityvalue = "0";
            console.log("data asset")
            console.log(result2.rows[0])
            for (let i = 0; i < result2.rowCount; i++) {
              if (result2.rows[i].tag === 'CashBalance') {
                res.cashbalance = result2.rows[i].val;
              }
              if (result2.rows[i].tag === 'LiquidityValue') {
                res.liquidityvalue = result2.rows[i].val;
              }
            }
          }

          let lsales_email = sales_email
          //dev 
          //lsales_email = 'andriansyah.nugroho@bahana.co.id'
          //lsales_email = 'anwar.raharja@bahana.co.id'
          //
          const userid = result.rows[0].userid
          const username = result.rows[0].username
          const email = lsales_email

          //[token, role, userid, editticket_id, user_name]
          // generate link
          const followlinktoken = crypto.randomBytes(20).toString('hex')
          await workflow.query('insert into followlinktoken values($1, $2, $3, $4, $5)', [followlinktoken, sales_user_id, sales_name, waiting_for, ticketid])

          var payload = new Object();
          payload.followlink = `${FOLLOWLINK}${followlinktoken}`
          payload.ticketid = ticketid
          payload.name = name
          payload.waiting_for = waiting_for
          payload.custcode = custcode
          payload.clientcash = parseInt(res.cashbalance).toLocaleString()
          payload.clientportfolio = parseInt(res.liquidityvalue).toLocaleString()
          payload.sid = res.sid
          if (res.opendate != null)
            payload.opendate = res.opendate.toLocaleString()
          else
            payload.opendate = ""
          payload.currapprovelimit = parseInt(res.approvelimit).toLocaleString()
          payload.requestedapprovelimit = parseInt(requestedapprovelimit).toLocaleString()
          payload.recvrname = sales_name
          payload.recommendedapprovelimit = "n.a"

          console.log(payload)
          const mailOptions = {
            from: 'ict@bahana.co.id',
            to: email,
            subject: subject + " " + sales_name + "(" + sales_user_id + ") to follow up.",
            html: mustache.render(template, { ...payload })
          };
          requestMail(mailOptions)
          // relaytransporter.sendMail(mailOptions, async function (error, info) {
          //   if (error) {
          //     console.log(error);
          //     let notes = "Send notification email to " + sales_email + " failed. " + error.message
          //     await createAuditTrail(ticketid, status, notes, user_id)
          //   } else {
          //     console.log('Email sent: ' + info.response);
          //     let notes = "Send notification email to " + sales_email + "."
          //     await createAuditTrail(ticketid, status, notes, user_id)
          //   }
          // });
        })
      }
    })

  }
  catch (e) {
    console.log(e)
  }
}

async function sendApproveEmailToSales(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, recommended_limit, sales_id, sales_name, sales_user_id, sales_email, status, user_id) {

  try {
    const template = fs.readFileSync('templateapprovesales.html', 'utf8');
    const replika = await poolreplika.connect();

    replika.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.rowCount > 0) {
        let res = new Object()
        res.custcode = result.rows[0].custcode
        res.sid = result.rows[0].sid
        res.opendate = result.rows[0].opendate
        res.approvelimit = result.rows[0].approvelimit
        console.log("data_customer")
        replika.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'", [custcode, custcode], function (err2, result2) {
          if (err2) {
            console.log(err)
          }
          if (result2.rowCount > 0) {
            res.cashbalance = "0"
            res.liquidityvalue = "0";
            console.log("data asset")
            console.log(result2.rows[0])
            for (let i = 0; i < result2.rowCount; i++) {
              if (result2.rows[i].tag === 'CashBalance') {
                res.cashbalance = result2.rows[i].val;
              }
              if (result2.rows[i].tag === 'LiquidityValue') {
                res.liquidityvalue = result2.rows[i].val;
              }
            }
          }

          let lsales_email = sales_email
          //dev 
          //lsales_email = 'andriansyah.nugroho@bahana.co.id'
          lsales_email = 'anwar.raharja@bahana.co.id'
          //
          const userid = result.rows[0].userid
          const username = result.rows[0].username
          const email = lsales_email

          var payload = new Object();
          payload.ticketid = ticketid
          payload.name = name
          payload.waiting_for = waiting_for
          payload.custcode = custcode
          payload.clientcash = parseInt(res.cashbalance).toLocaleString()
          payload.clientportfolio = parseInt(res.liquidityvalue).toLocaleString()
          payload.sid = res.sid
          if (res.opendate != null)
            payload.opendate = res.opendate.toLocaleString()
          else
            payload.opendate = ""
          payload.currapprovelimit = parseInt(res.approvelimit).toLocaleString()
          payload.requestedapprovelimit = parseInt(requestedapprovelimit).toLocaleString()
          payload.recvrname = sales_name
          payload.recommendedapprovelimit = parseInt(recommended_limit).toLocaleString()

          console.log(payload)
          const mailOptions = {
            from: 'ict@bahana.co.id',
            to: email,
            subject: subject,
            html: mustache.render(template, { ...payload })
          };
          requestMail(mailOptions)
          // relaytransporter.sendMail(mailOptions, async function (error, info) {
          //   if (error) {
          //     console.log(error);
          //     let notes = "Send notification email to " + sales_email + " failed. " + error.message
          //     await createAuditTrail(ticketid, status, notes, user_id)
          //   } else {
          //     console.log('Email sent: ' + info.response);
          //     let notes = "Send notification email to " + sales_email + "."
          //     await createAuditTrail(ticketid, status, notes, user_id)
          //   }
          // });
        })
      }
    })

  }
  catch (e) {
    console.log(e)
  }
}

async function sendApproveEmailToNasabah(ticketid, custname, waiting_for, custcode, requestedapprovelimit, subject, recommended_limit, user_id, custemail, status) {

  try {
    const template = fs.readFileSync('templateapprovenasabah.html', 'utf8');
    const replika = await poolreplika.connect();

    replika.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.rowCount > 0) {
        let res = new Object()
        res.custcode = result.rows[0].custcode
        res.sid = result.rows[0].sid
        res.opendate = result.rows[0].opendate
        res.approvelimit = result.rows[0].approvelimit
        console.log("data_customer")
        replika.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'", [custcode, custcode], function (err2, result2) {
          if (err2) {
            console.log(err)
          }
          if (result2.rowCount > 0) {
            res.cashbalance = "0"
            res.liquidityvalue = "0";
            console.log("data asset")
            console.log(result2.rows[0])
            for (let i = 0; i < result2.rowCount; i++) {
              if (result2.rows[i].tag === 'CashBalance') {
                res.cashbalance = result2.rows[i].val;
              }
              if (result2.rows[i].tag === 'LiquidityValue') {
                res.liquidityvalue = result2.rows[i].val;
              }
            }
          }

          const userid = result.rows[0].userid
          const username = result.rows[0].username
          const email = custemail

          var payload = new Object();
          payload.ticketid = ticketid
          payload.name = custname
          payload.waiting_for = waiting_for
          payload.custcode = custcode
          payload.clientcash = parseInt(res.cashbalance).toLocaleString()
          payload.clientportfolio = parseInt(res.liquidityvalue).toLocaleString()
          payload.sid = res.sid
          if (res.opendate != null)
            payload.opendate = res.opendate.toLocaleString()
          else
            payload.opendate = ""
          payload.currapprovelimit = parseInt(res.approvelimit).toLocaleString()
          payload.requestedapprovelimit = parseInt(requestedapprovelimit).toLocaleString()
          payload.recvrname = custname
          payload.recommendedapprovelimit = parseInt(recommended_limit).toLocaleString()

          console.log(payload)
          const mailOptions = {
            from: 'ict@bahana.co.id',
            to: email,
            subject: subject,
            html: mustache.render(template, { ...payload })
          };
          requestMail(mailOptions)
          // relaytransporter.sendMail(mailOptions, async function (error, info) {
          //   if (error) {
          //     console.log(error.message)
          //     let notes = "Send notification email to " + custemail + " failed. " + error.message
          //     await createAuditTrail(ticketid, status, notes, user_id)
          //   } else {
          //     console.log('Email sent: ' + info.response)
          //     let notes = "Send notification email to " + custemail + "."
          //     await createAuditTrail(ticketid, status, notes, user_id)
          //   }
          // });
        })
      }
    })

  }
  catch (e) {
    console.log(e)
  }
}

async function sendApproveEmailToRole(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, recommended_limit, status, user_id) {
  try {
    console.log("sendApproveEmailToRole(" + ticketid + "," + name + "," + waiting_for + "," + custcode + "," + requestedapprovelimit + "," + subject + "," + recommended_limit + "," + status + "," + user_id + ")")
    const template = fs.readFileSync('templatesales.html', 'utf8');
    const replika = await poolreplika.connect();
    const workflow = await poolworkflow.connect();
    const workflow2 = await poolworkflow.connect();
    replika.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.rowCount > 0) {
        let res = new Object()
        res.custcode = result.rows[0].custcode
        res.sid = result.rows[0].sid
        res.opendate = result.rows[0].opendate
        res.approvelimit = result.rows[0].approvelimit
        console.log("data_customer")
        replika.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'", [custcode, custcode], function (err2, result2) {
          if (err2) {
            console.log(err)
          }
          if (result2.rowCount > 0) {
            res.cashbalance = "0"
            res.liquidityvalue = "0";
            console.log("data asset")
            console.log(result2.rows[0])
            for (let i = 0; i < result2.rowCount; i++) {
              if (result2.rows[i].tag === 'CashBalance') {
                res.cashbalance = result2.rows[i].val;
              }
              if (result2.rows[i].tag === 'LiquidityValue') {
                res.liquidityvalue = result2.rows[i].val;
              }
            }
          }
          workflow.query("select * from users where roleuser=$1", [waiting_for], async function (err, result) {
            if (err) {
              console.log(err)
            }
            if (result.rowCount > 0) {
              for (let i = 0; i < result.rowCount; ++i) {
                const userid = result.rows[0].userid
                const username = result.rows[0].username
                const email = result.rows[0].email

                //[token, role, userid, editticket_id, user_name]
                // generate link
                const followlinktoken = crypto.randomBytes(20).toString('hex')
                await workflow2.query('insert into followlinktoken values($1, $2, $3, $4, $5)', [followlinktoken, userid, username, waiting_for, ticketid])

                var payload = new Object();
                payload.followlink = `${FOLLOWLINK}${followlinktoken}`
                payload.ticketid = ticketid
                payload.name = name
                payload.waiting_for = waiting_for
                payload.custcode = custcode
                payload.clientcash = parseInt(res.cashbalance).toLocaleString()
                payload.clientportfolio = parseInt(res.liquidityvalue).toLocaleString()
                payload.sid = res.sid
                if (res.opendate != null)
                  payload.opendate = res.opendate.toLocaleString()
                else
                  payload.opendate = ""
                payload.currapprovelimit = parseInt(res.approvelimit).toLocaleString()
                payload.requestedapprovelimit = parseInt(requestedapprovelimit).toLocaleString()
                payload.recvrname = username
                if (recommended_limit === "n.a") {
                  payload.recommendedapprovelimit = recommended_limit
                }
                else {
                  payload.recommendedapprovelimit = parseInt(recommended_limit).toLocaleString()
                }
                console.log("payload");
                console.log(payload)


                const mailOptions = {
                  from: 'ict@bahana.co.id',
                  to: email,
                  subject: subject + " " + username + "(" + userid + ") to follow up.",
                  html: mustache.render(template, { ...payload })
                };
                requestMail(mailOptions)
                // relaytransporter.sendMail(mailOptions, async function (error, info) {
                //   if (error) {
                //     console.log(error);
                //     let notes = "Send notification email to " + email + " failed. " + error.message
                //     await createAuditTrail(ticketid, status, notes, user_id)
                //   } else {
                //     console.log('Email sent: ' + info.response);
                //     let notes = "Send notification email to " + email + "."
                //     await createAuditTrail(ticketid, status, notes, user_id)
                //   }
                // });
              }
            }
          })

        })
      }
    })

  }
  catch (e) {
    console.log(e)
  }
}

async function sendRejectEmailToSales(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, status, user_id, rejectreason, sales_id, sales_name, sales_user_id, sales_email, status) {
  try {
    console.log("sendRejectEmailToSales(" + ticketid + "," + name + "," + waiting_for + "," + custcode + "," + requestedapprovelimit + "," + subject + "," + status + "," + user_id + "," + rejectreason + "," + sales_id + "," + sales_name + "," + sales_user_id + "," + sales_email + "," + status + ")")
    const template = fs.readFileSync('templatereject.html', 'utf8');
    const ticketname = name
    const replika = await poolreplika.connect();
    replika.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.rowCount > 0) {
        let res = new Object()
        res.custcode = result.rows[0].custcode
        res.sid = result.rows[0].sid
        res.opendate = result.rows[0].opendate
        res.approvelimit = result.rows[0].approvelimit
        res.email = result.rows[0].email
        console.log("data_customer " + res)
        replika.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'", [custcode, custcode], function (err2, result2) {
          if (err2) {
            console.log(err)
          }
          if (result2.rowCount > 0) {
            res.cashbalance = "0"
            res.liquidityvalue = "0";
            console.log("data asset")
            console.log(result2.rows[0])
            for (let i = 0; i < result2.rowCount; i++) {
              if (result2.rows[i].tag === 'CashBalance') {
                res.cashbalance = result2.rows[i].val;
              }
              if (result2.rows[i].tag === 'LiquidityValue') {
                res.liquidityvalue = result2.rows[i].val;
              }
            }

            let lsales_email = sales_email
            //dev
            //lsales_email = 'andriansyah.nugroho@bahana.co.id'
            lsales_email = 'anwar.raharja@bahana.co.id'
            //dev
            const email = lsales_email

            var payload = new Object();
            payload.ticketid = ticketid
            payload.name = sales_name
            payload.ticketname = ticketname
            payload.waiting_for = waiting_for
            payload.custcode = custcode
            payload.clientcash = parseInt(res.cashbalance).toLocaleString()
            payload.clientportfolio = parseInt(res.liquidityvalue).toLocaleString()
            payload.sid = res.sid
            if (res.opendate != null)
              payload.opendate = res.opendate.toLocaleString()
            else
              payload.opendate = ""
            payload.currapprovelimit = parseInt(res.approvelimit).toLocaleString()
            payload.requestedapprovelimit = parseInt(requestedapprovelimit).toLocaleString()
            payload.recommendedapprovelimit = "n.a"
            payload.rejectreason = rejectreason
            payload.userid = user_id
            console.log("payload");
            console.log(payload)
            const mailOptions = {
              from: 'ict@bahana.co.id',
              to: email,
              subject: subject,
              html: mustache.render(template, { ...payload })
            };
            requestMail(mailOptions)
            // relaytransporter.sendMail(mailOptions, async function (error, info) {
            //   if (error) {
            //     console.log(error);
            //     let notes = "Send notification email to " + email + " failed. " + error.message
            //     await createAuditTrail(ticketid, status, notes, user_id)
            //   } else {
            //     console.log('Email sent: ' + info.response);
            //     let notes = "Send notification email to " + email + "."
            //     await createAuditTrail(ticketid, status, notes, user_id)
            //   }
            // });
          }
        })
      }
    })

  }
  catch (e) {
    console.log(e)
  }
}

async function sendRejectEmailToNasabah(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, status, user_id, rejectreason) {
  try {
    console.log("sendRejectEmailToSales(" + ticketid + "," + name + "," + waiting_for + "," + custcode + "," + requestedapprovelimit + "," + subject + "," + status + "," + user_id + "," + rejectreason + ")")
    const template = fs.readFileSync('templatereject.html', 'utf8');

    const replika = await poolreplika.connect();
    replika.query("select * from customer where custcode=$1", [custcode], function (err, result) {
      if (err) {
        console.log(err)
      }
      if (result.rowCount > 0) {
        let res = new Object()
        res.custcode = result.rows[0].custcode
        res.sid = result.rows[0].sid
        res.opendate = result.rows[0].opendate
        res.approvelimit = result.rows[0].approvelimit
        res.email = result.rows[0].email
        console.log("data_customer " + res)
        replika.query("select 'LiquidityValue' as tag,sum(cast((balance-balance_hold)*price*((100-c.haircut)/100) as bigint)) as val from account a left join stock_last_price b on a.asset_code=b.stock_code left join stock_haircut c on a.asset_code=c.stock_code where base_account_no=$1 and account_type='P' union select 'CashBalance' as tag,sum(cast((balance-balance_hold) as bigint)) as val from account where base_account_no=$2 and account_type='C'", [custcode, custcode], function (err2, result2) {
          if (err2) {
            console.log(err)
          }
          if (result2.rowCount > 0) {
            res.cashbalance = "0"
            res.liquidityvalue = "0";
            console.log("data asset")
            console.log(result2.rows[0])
            for (let i = 0; i < result2.rowCount; i++) {
              if (result2.rows[i].tag === 'CashBalance') {
                res.cashbalance = result2.rows[i].val;
              }
              if (result2.rows[i].tag === 'LiquidityValue') {
                res.liquidityvalue = result2.rows[i].val;
              }
            }

            const email = result.rows[0].email

            var payload = new Object();
            payload.ticketid = ticketid
            payload.name = name
            payload.ticketname = name
            payload.waiting_for = waiting_for
            payload.custcode = custcode
            payload.clientcash = parseInt(res.cashbalance).toLocaleString()
            payload.clientportfolio = parseInt(res.liquidityvalue).toLocaleString()
            payload.sid = res.sid
            if (res.opendate != null)
              payload.opendate = res.opendate.toLocaleString()
            else
              payload.opendate = ""
            payload.currapprovelimit = parseInt(res.approvelimit).toLocaleString()
            payload.requestedapprovelimit = parseInt(requestedapprovelimit).toLocaleString()
            payload.recommendedapprovelimit = "n.a"
            payload.rejectreason = rejectreason
            console.log("payload:")
            console.log(payload)
            const mailOptions = {
              from: 'ict@bahana.co.id',
              to: email,
              subject: subject,
              html: mustache.render(template, { ...payload })
            };
            requestMail(mailOptions)

            // relaytransporter.sendMail(mailOptions, async function (error, info) {
            //   if (error) {
            //     console.log(error);
            //     let notes = "Send notification email to " + email + " failed. " + error.message
            //     await createAuditTrail(ticketid, status, notes, user_id)
            //   } else {
            //     console.log('Email sent: ' + info.response);
            //     let notes = "Send notification email to " + email + "."
            //     await createAuditTrail(ticketid, status, notes, user_id)
            //   }
            // });


          }
        })
      }
    })

  }
  catch (e) {
    console.log(e)
  }
}



router.get('/workflowtl/tickets', verifyToken, async (req, res, next) => {

  try {
    const client = await poolworkflow.connect()
    client.query('select * from tickets', function (err, result) {
      if (err) {
        console.log(err)
        client.release()
        return res.status(401).json({ result: "ERR", message: "Unauthorized" });
      }
      client.release()
      return res.status(200).json(result.rows);
    })
  }
  catch (e) {
    return res.status(403).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/ticketsbyrole/:role', verifyToken, async (req, res, next) => {

  console.log("get /ticketsbyrole called")
  const role = req.params.role
  try {
    const client = await poolworkflow.connect()
    client.query('select * from tickets where waiting_for=$1', [role], function (err, result) {
      if (err) {
        console.log(err)
        client.release()
        return res.status(401).json({ result: "ERR", message: err });
      }
      client.release()
      return res.status(200).json(result.rows);
    })
  }
  catch (e) {
    return res.status(403).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/audittrail/:ticketid', verifyToken, async (req, res, next) => {

  const ticketid = req.params.ticketid
  try {
    const client = await poolworkflow.connect()
    client.query("select ROW_NUMBER() OVER(ORDER BY a.id ) as no,a.id,a.created_at, c.deskripsi, a.notes, a.userid from audittrail  a inner join tickets b on a.ticket_id=b.id inner join status c on a.status=c.status where a.ticket_id=$1 order by a.id", [ticketid], function (err, result) {
      if (err) {
        console.log(err)
        client.release()
        return res.status(401).json({ result: "ERR", message: err });
      }
      client.release()
      return res.status(200).json(result.rows);
    })
  }
  catch (e) {
    return res.status(403).json({ result: "ERR", message: e.message })
  }
});

router.get('/workflowtl/tickets/:id', verifyToken, async (req, res, next) => {

  console.log("get /tickets/" + req.params.id + " called")
  try {
    const id = req.params.id
    const client = await poolworkflow.connect()
    client.query('select * from tickets where id=$1', [id], function (err, result) {
      if (err) {
        client.release()
        return res.status(401).json({ result: "ERR", message: "Unauthorized" });
      }
      if (result.rowCount > 0) {
        client.release()
        return res.status(200).json(result.rows[0]);
      }
      else {
        client.release()
        return res.status(200).json("");
      }
    })
  }
  catch (e) {
    return res.status(403).json({ result: "ERR", message: e.message })
  }
});


router.post('/workflowtl/tickets', verifyToken, async (req, res, next) => {

  console.log("post /tickets called")
  try {
    let { user_id, custcode, tradinglimit } = req.body

    const client = await poolworkflow.connect()
    client.query("Select count(*) exist from tickets where user_id=$1 and status < 6", [user_id], async (err0, checkresult) => {
      if (err0) {

        console.log("err when check tickets " + err0)
      }
      //console.log(checkresult.rows[0])
      //let exist = checkresult.rows[0];
      const replika = await poolreplika.connect()
      replika.query("select a.email as custemail,a.custcode,a.custname,a.sales_id, b.sales_name, b.user_id, b.email as salesemail from customer a inner join sales b on a.sales_id=b.sales_id where a.custcode=$1", [custcode], async (err, replikaresult) => {
        if (err) {
          console.log("ERROR " + err)
        }
        console.log(replikaresult.rows[0])
        let custcode = replikaresult.rows[0].custcode
        let custname = replikaresult.rows[0].custname
        let email = replikaresult.rows[0].custemail
        let sales_id = replikaresult.rows[0].sales_id
        let sales_name = replikaresult.rows[0].sales_name
        let sales_user_id = replikaresult.rows[0].user_id
        let sales_email = replikaresult.rows[0].salesemail

        const client = await poolworkflow.connect()

        client.query("INSERT INTO tickets (user_id, email, custcode, custname, tradinglimit, created_at, status, deskripsi, finish_in, waiting_for, sales_id, sales_name, sales_user_id, sales_email) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 1, (select deskripsi from status where status=1), (select finish_in from status where status=1),(select waiting_for from status where status=1), $6, $7, $8, $9) RETURNING *",
          [user_id, email, custcode, custname, tradinglimit, sales_id, sales_name, sales_user_id, sales_email], async (error, results) => {
            if (error) {
              console.log('error ' + error.message)
              client.release()
              return res.status(200).json({ result: "ERR", message: error.message })
            }
            let ticket_id = results.rows[0].id
            let status = 1
            let notes = 'Client request by ' + user_id

            await createAuditTrail(ticket_id, status, notes, user_id)

            let custname = results.rows[0].custname
            let waiting_for = results.rows[0].waiting_for
            let requestedapprovelimit = results.rows[0].tradinglimit
            let subject = "Tickets " + ticket_id + " are created by " + user_id + "."

            await sendCreateEmailToSales(ticket_id, custname, waiting_for, custcode, requestedapprovelimit, subject, sales_id, sales_name, sales_user_id, sales_email, 1, user_id)
            return res.status(201).json(results.rows[0])
          })
      })
    })
  }
  catch (e) {
    console.log(e)
    return res.status(500).json({ result: "ERR", message: e.message })
  }
});

router.put('/workflowtl/ticketapprove/:id', verifyToken, async (req, res, next) => {

  try {
    const client = await poolworkflow.connect()
    const id = parseInt(req.params.id)
    let { userid, user_name, role, recommended_limit, refftoken } = req.body
    console.log("put userid: " + userid + ", role: " + role + ", recommended_limit: " + recommended_limit + " refftoken: " + refftoken)
    let querystr = "";
    let audittrailstr = "";
    let status = 1;
    if (refftoken !== null) {
      console.log("deleting refftoken " + refftoken)
      await client.query('delete from followlinktoken where followlinktoken=$1', [refftoken])
    }
    if (role === 'SALES') {
      status = 2;
      querystr = "UPDATE tickets SET salesuser='" + userid + "',salesapprove=true,status=2,deskripsi='Approved by Sales',finish_in='SALES',waiting_for='HEADEQRETAIL',salestime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 2, CURRENT_TIMESTAMP, 'Approved by " + userid + "', '" + userid + "')";
      recommended_limit = "n.a"
    }
    else if (role === 'HEADEQRETAIL') {
      status = 3;
      querystr = "UPDATE tickets SET headeqretailuser='" + userid + "',headeqretailapprove=true,status=3,deskripsi='Approved by HeadEQRetail',finish_in='HEADEQRETAIL',waiting_for='RM',headeqretailtime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 3, CURRENT_TIMESTAMP, 'Approved by " + userid + "', '" + userid + "')";
      recommended_limit = "n.a"
    }
    else if (role === 'RM') {
      status = 4;
      querystr = "UPDATE tickets SET rmuser='" + userid + "',rmapprove=true,status=4,deskripsi='Approved by RM',finish_in='RM',waiting_for='MGMT',recommended_limit=" + recommended_limit + ",rmtime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 4, CURRENT_TIMESTAMP, 'Approved by " + userid + ", Recommended limit: " + recommended_limit + "', '" + userid + "')";
    }
    else if (role === 'MGMT') {
      status = 5;
      querystr = "UPDATE tickets SET mgmtuser='" + userid + "',mgmtapprove=true,status=5,deskripsi='Approved by MGMT',finish_in='MGMT',waiting_for='',mgmttime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 5, CURRENT_TIMESTAMP, 'Approved by " + userid + "', '" + userid + "')";
    }
    console.log(querystr)
    client.query(querystr, [], (error, results) => {

      if (error) {
        console.log(error)
        client.release()
        return res.status(500).json({ result: "Error", message: "2Server Error " + error })
      }
      client.query(audittrailstr, [], (error2, results2) => {
        if (error2) {
          console.log(audittrailstr)
          console.log(error2)
        }
        client.release()
        const ticketid = results.rows[0].id
        const name = results.rows[0].custname
        const waiting_for = results.rows[0].waiting_for
        const custcode = results.rows[0].custcode
        const requestedapprovelimit = results.rows[0].tradinglimit
        const subject = "Ticket for " + custcode + " are Approved by " + userid + ". "

        if (role === 'MGMT') {

          const custname = results.rows[0].custname
          let subject = 'Request limit for ' + custname + ' has been approved.'
          let sales_id = results.rows[0].sales_id
          let sales_name = results.rows[0].sales_name
          let sales_user_id = results.rows[0].sales_user_id
          let sales_email = results.rows[0].sales_email
          let user_id = userid
          let custemail = results.rows[0].email
          let lrecommendedlimit = results.rows[0].recommended_limit
          sendApproveEmailToSales(ticketid, custname, waiting_for, custcode, requestedapprovelimit, subject, lrecommendedlimit, sales_id, sales_name, sales_user_id, sales_email, 5, user_id)
          sendApproveEmailToNasabah(ticketid, custname, waiting_for, custcode, requestedapprovelimit, subject, lrecommendedlimit, user_id, custemail, 5)
        }
        else {
          sendApproveEmailToRole(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, recommended_limit, status, userid)
        }
        return res.status(201).json(results.rows[0])
      })
    })
  }
  catch (e) {
    return res.status(500).json({ result: "Error", message: "3Server Error " + e })
  }
});

router.put('/workflowtl/ticketreject/:id', verifyToken, async (req, res, next) => {

  try {
    const client = await poolworkflow.connect()
    const id = parseInt(req.params.id)
    let { userid, user_name, role, rejectreason, refftoken } = req.body
    console.log("put userid: " + userid + ",user_name: " + user_name + ", role: " + role + ", rejectreason: " + rejectreason)
    let querystr = "";
    let status = 0;
    let audittrailstr = ""
    let username = "";
    if (refftoken !== null) {
      console.log("deleting refftoken " + refftoken)
      await client.query('delete from followlinktoken where followlinktoken=$1', [refftoken])
    }

    if (role === 'SALES') {
      querystr = "UPDATE tickets SET salesuser='" + userid + "',salesapprove=false,status=92,deskripsi='Rejected by Sales',finish_in='SALES',waiting_for='NASABAH',salesrejectreason='" + rejectreason + "',salestime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 92, CURRENT_TIMESTAMP, 'Rejected by " + userid + ", Reject reason: " + rejectreason + "', '" + userid + "')";
      status = 92
    }
    else if (role === 'HEADEQRETAIL') {
      querystr = "UPDATE tickets SET headeqretailuser='" + userid + "',headeqretailapprove=false,status=93,deskripsi='Rejected by HeadEQRetail',finish_in='HEADEQRETAIL',waiting_for='NASABAH',headeqretailrejectreason='" + rejectreason + "',headeqretailtime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 93, CURRENT_TIMESTAMP, 'Rejected by " + userid + ", Reject reason: " + rejectreason + "', '" + userid + "')";
      status = 93
    }
    else if (role === 'RM') {
      querystr = "UPDATE tickets SET rmuser='" + userid + "',rmapprove=false,status=94,deskripsi='Rejected by RM',finish_in='RM',waiting_for='NASABAH',rmrejectreason='" + rejectreason + "',rmtime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 94, CURRENT_TIMESTAMP, 'Rejected by " + userid + ", Reject reason: " + rejectreason + "', '" + userid + "')";
      status = 94
    }
    else if (role === 'MGMT') {
      querystr = "UPDATE tickets SET mgmtuser='" + userid + "',mgmtapprove=false,status=95,deskripsi='Rejected by MGMT',finish_in='MGMT',waiting_for='NASABAH',mgmtrejectreason='" + rejectreason + "',mgmttime=CURRENT_TIMESTAMP WHERE id=" + id + " returning *";
      audittrailstr = "INSERT INTO public.audittrail(ticket_id, status, created_at, notes, userid)	VALUES (" + id + ", 95, CURRENT_TIMESTAMP, 'Rejected by " + userid + ", Reject reason: " + rejectreason + "', '" + userid + "')";
      status = 95
    }
    console.log(querystr)
    client.query(querystr, [], (error, results) => {

      if (error) {
        console.log(error)
        client.release()
        return res.status(500).json({ result: "Error", message: "4Server Error " + error })
      }
      client.query(audittrailstr, [], async (error2, results2) => {
        if (error2) {
          console.log(audittrailstr)
          console.log(error2)
        }

        const ticketid = results.rows[0].id
        const name = results.rows[0].custname
        const waiting_for = results.rows[0].waiting_for
        const custcode = results.rows[0].custcode
        const requestedapprovelimit = results.rows[0].tradinglimit
        //const rejectreason = results.rows[0].rejectreason
        const sales_id = results.rows[0].sales_id
        const sales_name = results.rows[0].sales_name
        const sales_user_id = results.rows[0].sales_user_id
        const sales_email = results.rows[0].sales_email
        const subject = "Ticket for " + custcode + " are Rejected by " + user_name + ". "

        client.release()

        await sendRejectEmailToNasabah(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, status, sales_name, rejectreason)

        await sendRejectEmailToSales(ticketid, name, waiting_for, custcode, requestedapprovelimit, subject, status, user_name, rejectreason, sales_id, sales_name, sales_user_id, sales_email, status)

        return res.status(201).json(results.rows[0])
      })
    })
  }
  catch (e) {
    return res.status(500).json({ result: "Error", message: "3Server Error " + e })
  }
});

router.delete('/workflowtl/tickets/:id', verifyToken, async (req, res, next) => {

  try {
    const client = await poolworkflow.connect()
    const id = parseInt(req.params.id)

    client.query("Update tickets SET status=99, deskripsi=$1, finish_in='', waiting_for='' WHERE id = $2", ['Canceled by User', id], async (error, results) => {
      if (error) {
        client.release()
        return res.status(500).json({ result: "Error", message: "Server Error " + error })
      }
      //res.status(200).send(`User deleted with ID: ${id}`)
      client.release()
      await createAuditTrail(id, 99, 'Delete by user', "")
      return res.status(200).json({ result: "OK", message: "Ticket mark deleted with ID: " + id })
    })
  }
  catch (e) {
    console.log(e)
    return res.status(500).json({ result: "Error", message: "Server Error" + e })
  }
});

module.exports = router;
