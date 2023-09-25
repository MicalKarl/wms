const express = require('express');
const { set } = require('express/lib/application');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');
const app = express()
const port = 3000
var cors = require('cors')
app.use(cors()) // Use this after the variable declaration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

const QrTimeMs = 70000;
qrdata = {
    data: undefined,
    ctime: Date.now(), 
    reqServerTime: Date.now(),
    wpollre_scred: undefined,
    QRKey:undefined,
    QrTimeMs: QrTimeMs
}
wmLoginData = {
    iPlanetDirectoryPro:undefined,
    loginDate: undefined,
    wpollre_scred: undefined,
    scriptReqTimes: 0,
    logoutReqTimes: 0,
}

rndCode = {
    code:undefined,
    ctime: undefined,
    reqServerTime: undefined
}

function genCode(n)
{
    let code = '';
    const p = '0123456789';
    for(let i = 0; i < n; i++)
    {
        const ix = Math.floor(Math.random() * p.length);
        code += p.charAt(ix);
    }
    return code;
}

function getCookie(s, key)
{
    const ix = s.indexOf(key);
    const ix2 = s.indexOf(';', ix + key.length);
    return s.substring(ix + key.length, ix2);
}

function genQrCode()
{
    try{
        (async ()=>{
            qrdata.ctime = Date.now();
            const res2 = await fetch(`https://qr.sec.wanmei.net:20176/qrservice/v1.0/show?t=${qrdata.ctime}&rcode=${genCode(6)}`);
            const data = await res2.json();
            qrdata.data = data;
            const sck = res2.headers.get('Set-Cookie');
            qrdata.wpollre_scred = getCookie(sck, 'wpollre_scred=');
            qrdata.QRKey = getCookie(sck, 'QRKey=');
        })();
    }catch(err)
    {
        console.log(`gen Qrcode error: ${err}`);
    }finally{
        // process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1;
    }
}


function wmLogin(code)
{
    if(qrdata.wpollre_scred != undefined && code == rndCode.code && code !== undefined || wmLoginData.wpollre_scred != qrdata.wpollre_scred)
    {
        const url = `https://qr.sec.wanmei.net:20176/qrservice/v1.0/check?t=${Date.now()}&token=${qrdata.wpollre_scred}`;
        try{
            (async ()=>{
                const res = await fetch(url, {headers: {
                    cookie: `QRKey=${qrdata.QRKey}; ec=HQvIykdU-1691475000578-14282591e3edd-819412952; i18next=cn;wpollre_scred=${qrdata.wpollre_scred}; _efmdata=7Az08O31SuuPpgdBEDMA%2BkgYB7mktxYXPEoOx6WOvJPWJq2mH3oz0FJvMLE0Xt0L555%2BcTH6vXJUaLAaWlqfZQ%3D%3D; _exid=iTqBJJm905s7IAF5xQkj6aIGQT5yerUKIp3FnlbiO8A%3D`
                }});
                const data = await res.json();
                if(res.status == 200 && data.status == 200)
                {
                    wmLoginData.loginDate= Date.now();
                    wmLoginData.iPlanetDirectoryPro = data.tokenId;
                    wmLoginData.wpollre_scred = qrdata.wpollre_scred;
                }else{
                    wmLoginData.iPlanetDirectoryPro = undefined;
                }
            })();
        }catch(err)
        {
            console.log(`wmLogin error: ${err}`);
        }
    }
}

function genRndCode()
{
    if(rndCode.ctime == undefined || Date.now() - rndCode.ctime > QrTimeMs)
    {
        rndCode.code = genCode(4);
        rndCode.ctime = Date.now();
    }
    rndCode.reqServerTime = Date.now();
}

const _qrInterval = setInterval(() => {
    genRndCode();
    genQrCode();
    // 
    wmLoginData.iPlanetDirectoryPro = undefined;
}, QrTimeMs);


app.get('/', (req, res) => {
    res.redirect('https://github.com/torvalds/linux');
})

app.get('/secredCode', (req, res) => {
    genRndCode();
    res.render('rndcode', {code: rndCode.code});
})

app.get("/qrcode", (req, res)=>{
    qrdata.reqServerTime = Date.now();
    return res.json(qrdata);
})

app.get("/rndcode", (req, res)=>{
    genRndCode();
    return res.json(rndCode);
})

app.post("/login", (req, res)=>{
    if(req.query.code != rndCode.code)
    {
        res.send('code not correct:)');
    }
    wmLogin(req.query.code);
    res.send('ok!!!');
})

app.get("/login", (req, res)=>{
    if(req.query.scriptReqTimes != undefined)
    {
        wmLoginData.scriptReqTimes += 1;
    }
    return res.json(wmLoginData);
})

function getBeijingDate()
{
    return new Date(Date.now() + 8* 3600 * 1000);
}

app.get("/logout", (req, res)=>{
    if(req.query.scriptReqTimes != undefined)
    {
        wmLoginData.logoutReqTimes += 1;
    }
    const d = getBeijingDate();
    if(d.getHours() >= 18 && d.getHours() <= 23)
    {
        return res.json(wmLoginData);
    }else{
        return res.json({});
    }
})

app.use('/static', express.static(path.join(__dirname, 'public')))


app.listen(port, () => {
  console.log(`wms listening on port ${port}`)
  genQrCode();
})
