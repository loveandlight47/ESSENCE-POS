import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LayoutDashboard, ShoppingCart, ReceiptText, Users, Scissors, Download, Plus, Trash2, Printer, Search, Pencil, X, Check, Wallet, Percent, CalendarDays, RotateCcw, FileSpreadsheet } from "lucide-react";
import "./styles.css";
import { supabase } from "./supabase";
const VAT_RATE = 0.075, DEFAULT_COMMISSION = 30;
const MANAGER_ACCESS_CODE = "Saloon@90";
const KEYS = { sales: "essence-pos-v2-sales", staff: "essence-pos-v2-staff", services: "essence-pos-v2-services" };
const money = n => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(n) || 0);
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function csvDownload(rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF"+csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "essence-salon-sales.csv"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function App() {
  const [page,setPage] = useState("New Sale");
  const [staffSession, setStaffSession] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
const [staffPin, setStaffPin] = useState("");
const [staffProfile, setStaffProfile] = useState(null);
const [staffLoginError, setStaffLoginError] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
const [managerPassword, setManagerPassword] = useState("");
const [managerAuthError, setManagerAuthError] = useState("");
const [newStaffName, setNewStaffName] = useState("");
const [newStaffUsername, setNewStaffUsername] = useState("");
const [newStaffPin, setNewStaffPin] = useState("");
const [newStaffCommission, setNewStaffCommission] = useState("30");
const [staffCreateMessage, setStaffCreateMessage] = useState("");
const [staffCreateError, setStaffCreateError] = useState("");
const [managerUnlocked,setManagerUnlocked] = useState(false);
const [managementTab,setManagementTab] = useState("Dashboard");
  const [sales,setSales] = useState(()=>read(KEYS.sales,[]));
  const [staff,setStaff] = useState(()=>read(KEYS.staff,[]).map(p=>typeof p==="string"?{id:uid(),name:p,commissionRate:DEFAULT_COMMISSION}:{id:p.id||uid(),name:p.name||"",commissionRate:Number(p.commissionRate??DEFAULT_COMMISSION)}));
  const [services,setServices] = useState(()=>read(KEYS.services,[]).map(s=>({...s,id:s.id||uid(),price:Number(s.price)||0})));
  const [notice,setNotice] = useState(""), [search,setSearch] = useState(""), [dateFilter,setDateFilter] = useState(today());
  const saveSales=v=>{setSales(v);localStorage.setItem(KEYS.sales,JSON.stringify(v));};
  const saveStaff=v=>{setStaff(v);localStorage.setItem(KEYS.staff,JSON.stringify(v));};
  const saveServices=v=>{setServices(v);localStorage.setItem(KEYS.services,JSON.stringify(v));};
  const handleStaffLogin = async (event) => {
  event.preventDefault();
  setStaffLoginError("");

  try {
    const { data, error } = await supabase.functions.invoke(
      "staff-login",
      {
        body: {
          username: staffUsername.trim().toLowerCase(),
          pin: staffPin,
        },
      }
    );

    if (error) throw error;
    if (!data?.token || !data?.profile) {
      throw new Error(data?.error || "Login failed. Check your username and PIN.");
    }

    setStaffSession(data.token);
    setStaffProfile(data.profile);
    setStaffPin("");
  } catch (error) {
    setStaffLoginError(
      error.message || "Unable to sign in. Please try again."
    );
  }
};

const handleManagerSignIn = async (event) => {
  event.preventDefault();
  setManagerAuthError("");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: managerEmail.trim(),
      password: managerPassword,
    });

    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.role !== "manager") {
      await supabase.auth.signOut();
      throw new Error("This account is not authorised for management.");
    }

    setManagerPassword("");
    setManagerUnlocked(true);
    setPage("Management");
  } catch (error) {
    setManagerAuthError(
      error.message || "Manager sign-in failed. Please try again."
    );
  }
};

const handleCreateStaff = async (event) => {
  event.preventDefault();
  setStaffCreateMessage("");
  setStaffCreateError("");

  if (!/^\d{6}$/.test(newStaffPin)) {
    setStaffCreateError("The staff PIN must contain exactly six digits.");
    return;
  }

  const commission = Number(newStaffCommission);

  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    setStaffCreateError("Commission must be between 0 and 100.");
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "staff-provision",
      {
        body: {
          display_name: newStaffName.trim(),
          username: newStaffUsername.trim().toLowerCase(),
          pin: newStaffPin,
          commission_rate: commission,
        },
      }
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    setStaffCreateMessage(
      `Account created for ${newStaffName.trim()}.`
    );
    setNewStaffName("");
    setNewStaffUsername("");
    setNewStaffPin("");
    setNewStaffCommission("30");
  } catch (error) {
    setStaffCreateError(
      error.message || "Could not create the staff account."
    );
  }
};

  const flash=t=>{setNotice(t);window.setTimeout(()=>setNotice(""),2500);};
  const todaySales=sales.filter(s=>s.date===today());
  const filtered=useMemo(()=>sales.filter(s=>[s.receiptNo,s.customerName,s.paymentMethod,...(s.items||[]).map(i=>i.serviceName+" "+i.staffName)].join(" ").toLowerCase().includes(search.toLowerCase())&&(!dateFilter||s.date===dateFilter)),[sales,search,dateFilter]);
  const exportSales=list=>csvDownload([["Receipt","Date","Customer","Services","Staff","Subtotal","Discount","VAT","Total","Commission","Payment"],...list.map(s=>[s.receiptNo,s.date,s.customerName,(s.items||[]).map(i=>`${i.serviceName} x${i.quantity}`).join("; "),(s.items||[]).map(i=>i.staffName).join("; "),s.subtotal,s.discount,s.vat,s.total,s.commission,s.paymentMethod])]);
  const nav=[["Management",LayoutDashboard],["New Sale",ShoppingCart],["Sales History",ReceiptText],["Services",Scissors]];
  
if (staffSession && staffProfile) {
  return (
    <div className="shell">
      <main className="main">
        <header className="top">
          <div>
            <h1>Staff Portal</h1>
            <p>Essence Unisex Salon & Spa</p>
          </div>
        </header>
        <Panel
          title={`Welcome, ${staffProfile.display_name || staffProfile.name || staffUsername}`}
          subtitle="Your staff portal is being prepared."
        >
          <p>Signed in successfully.</p>
          <button
            className="btn"
            onClick={async () => {
              try {
                await supabase.functions.invoke("staff-logout", {
                  body: {},
                  headers: { "x-staff-session": staffSession }
                });
              } finally {
                setStaffSession("");
                setStaffProfile(null);
                setStaffUsername("");
                setStaffPin("");
                setPage("New Sale");
              }
            }}
          >
            Log out
          </button>
        </Panel>
      </main>
    </div>
  );
}

if (!staffSession && !managerUnlocked) {
  return (
    <div className="shell">
      <main className="main">
        <Panel title="Essence Staff Login" subtitle="Sign in with your username and six-digit PIN.">
          <form onSubmit={handleStaffLogin}>
            <Field label="Username">
              <input
                autoComplete="username"
                value={staffUsername}
                onChange={e => setStaffUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Six-digit PIN">
              <input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={6}
                pattern="[0-9]{6}"
                value={staffPin}
                onChange={e => setStaffPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </Field>
            {staffLoginError && <p role="alert">{staffLoginError}</p>}
            <button className="btn primary" type="submit">Sign in</button>
          </form>
          
<form onSubmit={handleManagerSignIn}>
  <h3>Manager Sign In</h3>

  <Field label="Manager email">
    <input
      type="email"
      autoComplete="username"
      value={managerEmail}
      onChange={e => setManagerEmail(e.target.value)}
      required
    />
  </Field>

  <Field label="Manager password">
    <input
      type="password"
      autoComplete="current-password"
      value={managerPassword}
      onChange={e => setManagerPassword(e.target.value)}
      required
    />
  </Field>

  {managerAuthError && (
    <p role="alert">{managerAuthError}</p>
  )}

  <button className="btn primary" type="submit">
    Sign in as Manager
  </button>
</form>

        </Panel>
      </main>
    </div>
  );
}

  return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brandmark">E</span><div><b>ESSENCE</b><small>UNISEX SALON & SPA</small></div></div><nav>{nav.map(([n,I])=><button key={n} className={page===n?"nav active":"nav"} onClick={()=>{
  if(n==="Management"){
    const code=window.prompt("Enter management access code");
    if(code===MANAGER_ACCESS_CODE){
      setManagerUnlocked(true);
      setPage("Management");
    }else if(code!==null){
      alert("Incorrect access code.");
    }
  }else{
    setManagerUnlocked(false);
    setPage(n);
  }
}}><I size={18}/>{n}</button>)}</nav><small className="sidefoot">Salon POS · VAT 7.5%</small></aside>
  <main className="main"><header className="top"><div><h1>{page}</h1><p>Essence Unisex Salon & Spa</p></div><span className="date"><CalendarDays size={16}/>{today()}</span></header>{notice&&<div className="notice">{notice}</div>}
  
{page==="Management"&&managerUnlocked&&<>
  <div className="actions">
    <button className="btn" onClick={()=>setManagementTab("Dashboard")}>Dashboard</button>
    <button className="btn" onClick={()=>setManagementTab("Staff & Commission")}>Staff & Commission</button>
    <button className="btn" onClick={()=>setManagementTab("Monthly Reports")}>Monthly Reports</button>
    <button className="btn" onClick={()=>{setManagerUnlocked(false);setPage("New Sale");}}>Lock Management</button>
  </div>
  {managementTab==="Dashboard"&&<Dashboard sales={sales} staff={staff} todaySales={todaySales} newSale={()=>setPage("New Sale")} exportAll={()=>exportSales(sales)}/>}
  {managementTab==="Staff & Commission"&&<Staff staff={staff} sales={sales} save={saveStaff} flash={flash}/>}
  {managementTab==="Staff & Commission" && managerUnlocked && (
  <Panel
    title="Create Staff Login Account"
    subtitle="Create a username and six-digit PIN for a staff member."
  >
    <form onSubmit={handleCreateStaff}>
      <Field label="Staff full name">
        <input
          value={newStaffName}
          onChange={e => setNewStaffName(e.target.value)}
          required
        />
      </Field>

      <Field label="Username">
        <input
          value={newStaffUsername}
          onChange={e =>
            setNewStaffUsername(
              e.target.value.toLowerCase().trim()
            )
          }
          autoComplete="off"
          required
        />
      </Field>

      <Field label="Six-digit PIN">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          pattern="[0-9]{6}"
          value={newStaffPin}
          onChange={e =>
            setNewStaffPin(
              e.target.value.replace(/\D/g, "").slice(0, 6)
            )
          }
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="Commission (%)">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={newStaffCommission}
          onChange={e => setNewStaffCommission(e.target.value)}
          required
        />
      </Field>

      {staffCreateError && (
        <p role="alert">{staffCreateError}</p>
      )}

      {staffCreateMessage && (
        <p role="status">{staffCreateMessage}</p>
      )}

      <button className="btn primary" type="submit">
        Create Staff Account
      </button>
    </form>
  </Panel>
)}
 {managementTab==="Monthly Reports"&&<MonthlyReports sales={sales} staff={staff}/>}
</>}

 {page==="New Sale"&&<NewSale staff={staff} services={services} cancel={()=>setPage("Sales History")} complete={s=>{saveSales([s,...sales]);flash("Sale saved: "+s.receiptNo);setPage("Sales History");}}/>}
  {page==="Sales History"&&<History sales={filtered} search={search} setSearch={setSearch} date={dateFilter} setDate={setDateFilter} exportIt={()=>exportSales(filtered)} remove={id=>{if(confirm("Delete this sale permanently?")){saveSales(sales.filter(s=>s.id!==id));flash("Sale deleted.");}}}/>}
  {page==="Services"&&<Services services={services} save={saveServices} flash={flash}/>}
  <footer>Essence Salon POS · Export your sales regularly for backup.</footer></main></div>;
}
function Panel({title,subtitle,children}){return <section className="panel"><div className="panelhead"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>}
function Field({label,children}){return <label className="field"><span>{label}</span>{children}</label>}
function Metric({icon:I,label,value}){return <div className="metric">{I&&<span className="metricicon"><I size={19}/></span>}<div><small>{label}</small><b>{value}</b></div></div>}
function Table({headers,children}){return <div className="tablewrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
function Dashboard({sales,staff,todaySales,newSale,exportAll}) {
 const rev=sales.reduce((a,s)=>a+Number(s.total||0),0), vat=sales.reduce((a,s)=>a+Number(s.vat||0),0), comm=sales.reduce((a,s)=>a+Number(s.commission||0),0);
 const perf=staff.map(p=>{const lines=sales.flatMap(s=>s.items||[]).filter(i=>i.staffId===p.id);return {...p,sales:lines.reduce((a,i)=>a+Number(i.unitPrice)*Number(i.quantity),0),commission:lines.reduce((a,i)=>a+Number(i.commissionAmount??(i.unitPrice*i.quantity*i.commissionRate/100)),0)}}).sort((a,b)=>b.sales-a.sales);
 return <><div className="actions"><button className="btn primary" onClick={newSale}><Plus size={16}/> New Sale</button><button className="btn" onClick={exportAll}><Download size={16}/> Export CSV</button></div><div className="metrics"><Metric icon={Wallet} label="Today's Revenue" value={money(todaySales.reduce((a,s)=>a+s.total,0))}/><Metric icon={ReceiptText} label="Today's Transactions" value={todaySales.length}/><Metric icon={Percent} label="Today's VAT" value={money(todaySales.reduce((a,s)=>a+s.vat,0))}/><Metric icon={Users} label="Today's Commission" value={money(todaySales.reduce((a,s)=>a+s.commission,0))}/></div><div className="metrics three"><Metric label="All-time Revenue" value={money(rev)}/><Metric label="All-time VAT" value={money(vat)}/><Metric label="All-time Commission" value={money(comm)}/></div>
 <Panel title="Staff Performance" subtitle="Service sales and estimated commissions"><Table headers={["Staff","Rate","Sales","Commission"]}>{perf.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.commissionRate}%</td><td>{money(p.sales)}</td><td>{money(p.commission)}</td></tr>)}{!perf.length&&<tr><td colSpan="4" className="empty">Add staff members to view performance.</td></tr>}</Table></Panel>
 <Panel title="Recent Sales" subtitle="Latest transactions"><Table headers={["Receipt","Date","Customer","Total"]}>{sales.slice(0,5).map(s=><tr key={s.id}><td>{s.receiptNo}</td><td>{s.date}</td><td>{s.customerName}</td><td>{money(s.total)}</td></tr>)}{!sales.length&&<tr><td colSpan="4" className="empty">No sales recorded yet.</td></tr>}</Table></Panel></>;
}
function NewSale({staff,services,cancel,complete}) {
 const [customer,setCustomer]=useState(""),[payment,setPayment]=useState("Cash"),[discount,setDiscount]=useState("0"),[notes,setNotes]=useState(""),[serviceId,setServiceId]=useState(""),[staffId,setStaffId]=useState(""),[qty,setQty]=useState("1"),[items,setItems]=useState([]);
 const service=services.find(s=>s.id===serviceId), person=staff.find(s=>s.id===staffId);
 const subtotal=items.reduce((a,i)=>a+i.unitPrice*i.quantity,0), disc=Math.min(subtotal,Math.max(0,Number(discount)||0)), taxable=Math.max(0,subtotal-disc), vat=taxable*VAT_RATE,total=taxable;
 const commission=items.reduce((a,i)=>{const line=i.unitPrice*i.quantity, allocated=subtotal?disc*line/subtotal:0;return a+Math.max(0,line-allocated)*i.commissionRate/100;},0);
 const salonBalance = Math.max(0, taxable - vat - commission);
 const add=()=>{if(!service||!person)return alert("Select a service and staff member.");setItems(v=>[...v,{id:uid(),serviceId:service.id,serviceName:service.name,staffId:person.id,staffName:person.name,quantity:Math.max(1,Math.floor(Number(qty)||1)),unitPrice:Number(service.price),commissionRate:Number(person.commissionRate)}]);setServiceId("");setStaffId("");setQty("1");};
 const submit=e=>{e.preventDefault();if(!items.length)return alert("Add at least one service.");const receiptNo="ESS-"+Date.now().toString().slice(-8);complete({id:uid(),receiptNo,date:today(),customerName:customer.trim()||"Walk-in Customer",paymentMethod:payment,notes,items:items.map(i=>({...i,commissionAmount:Math.max(0,i.unitPrice*i.quantity-(subtotal?disc*i.unitPrice*i.quantity/subtotal:0))*i.commissionRate/100})),subtotal,discount:disc,vat,total,commission,status:"Paid"});};
 return <Panel title="New POS Transaction" subtitle="Add multiple services to one sale."><form onSubmit={submit}><div className="formgrid"><Field label="Customer name"><input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Walk-in Customer"/></Field><Field label="Payment method"><select value={payment} onChange={e=>setPayment(e.target.value)}>{["Cash","Bank Transfer","Card","POS Terminal","Other"].map(x=><option key={x}>{x}</option>)}</select></Field></div><h3>Add a service</h3><div className="formgrid four"><Field label="Service"><select value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">Select service</option>{services.map(s=><option key={s.id} value={s.id}>{s.name} — {money(s.price)}</option>)}</select></Field><Field label="Staff member"><select value={staffId} onChange={e=>setStaffId(e.target.value)}><option value="">Select staff</option>{staff.map(p=><option key={p.id} value={p.id}>{p.name} ({p.commissionRate}%)</option>)}</select></Field><Field label="Quantity"><input type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Field label="Auto-filled price"><div className="price">{money(service?.price||0)}</div></Field></div><button type="button" className="btn" onClick={add}><Plus size={16}/> Add to cart</button>
 <div className="tablewrap cart"><Table headers={["Service","Staff","Price","Qty","Amount",""]}>{items.map(i=><tr key={i.id}><td>{i.serviceName}</td><td>{i.staffName}</td><td>{money(i.unitPrice)}</td><td><input className="qty" type="number" min="1" value={i.quantity} onChange={e=>setItems(v=>v.map(x=>x.id===i.id?{...x,quantity:Math.max(1,Number(e.target.value)||1)}:x))}/></td><td>{money(i.unitPrice*i.quantity)}</td><td><button type="button" className="iconbtn danger" onClick={()=>setItems(v=>v.filter(x=>x.id!==i.id))}><Trash2 size={15}/></button></td></tr>)}{!items.length&&<tr><td colSpan="6" className="empty">Cart is empty.</td></tr>}</Table></div>
 <div className="checkout"><div className="stack"><Field label="Discount (₦)"><input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)}/></Field><Field label="Notes"><textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div><div className="totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Discount</span><b>-{money(disc)}</b></div>
<div><span>VAT deducted (7.5%)</span><b>-{money(vat)}</b></div>
<div><span>Staff commission deducted</span><b>-{money(commission)}</b></div>
<div className="grand"><span>Customer pays</span><b>{money(total)}</b></div>
<div><span>Salon balance after deductions</span><b>{money(salonBalance)}</b></div>
</div></div><div className="actions end"><button type="button" className="btn" onClick={cancel}>Cancel</button><button className="btn primary" type="submit"><Check size={16}/> Complete Sale</button></div></form></Panel>;
}
function History({sales,search,setSearch,date,setDate,exportIt,remove}) {
 const [receipt,setReceipt]=useState(null);
 return <><Panel title="Sales History" subtitle="Search, review, print receipts, and export transactions."><div className="filters"><label className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search receipt, customer, service or staff"/></label><Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><button className="btn" onClick={()=>{setSearch("");setDate("");}}><RotateCcw size={15}/> Reset</button><button className="btn" onClick={exportIt}><Download size={15}/> Export CSV</button></div><Table headers={["Receipt","Date","Customer","Total","Payment","Actions"]}>{sales.map(s=><tr key={s.id}><td>{s.receiptNo}</td><td>{s.date}</td><td>{s.customerName}</td><td>{money(s.total)}</td><td>{s.paymentMethod}</td><td><div className="inline"><button className="iconbtn" onClick={()=>setReceipt(s)} title="Receipt"><ReceiptText size={15}/></button><button className="iconbtn danger" onClick={()=>remove(s.id)} title="Delete"><Trash2 size={15}/></button></div></td></tr>)}{!sales.length&&<tr><td colSpan="6" className="empty">No sales match these filters.</td></tr>}</Table></Panel>{receipt&&<ReceiptModal sale={receipt} close={()=>setReceipt(null)}/>}</>;
}
function Services({services,save,flash}) {
 const [name,setName]=useState(""),[price,setPrice]=useState(""),[editing,setEditing]=useState(null);
 const reset=()=>{setName("");setPrice("");setEditing(null);};
 const submit=e=>{e.preventDefault();if(!name.trim()||price===""||!Number.isFinite(Number(price))||Number(price)<0)return alert("Enter a service name and valid price.");save(editing?services.map(s=>s.id===editing?{...s,name:name.trim(),price:Number(price)}:s):[...services,{id:uid(),name:name.trim(),price:Number(price)}]);flash(editing?"Service updated.":"Service added.");reset();};
 return <Panel title="Service Catalogue" subtitle="Manage service names and prices."><form className="formgrid editor" onSubmit={submit}><Field label="Service name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Braiding"/></Field><Field label="Price (₦)"><input required type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></Field><div className="editactions"><button className="btn primary"><Plus size={15}/>{editing?"Save changes":"Add service"}</button>{editing&&<button type="button" className="btn" onClick={reset}><X size={15}/> Cancel</button>}</div></form><Table headers={["Service","Price","Actions"]}>{services.map(s=><tr key={s.id}><td>{s.name}</td><td>{money(s.price)}</td><td><div className="inline"><button className="iconbtn" onClick={()=>{setEditing(s.id);setName(s.name);setPrice(String(s.price));}}><Pencil size={15}/></button><button className="iconbtn danger" onClick={()=>{if(confirm(`Delete ${s.name}? Existing sales stay recorded.`)){save(services.filter(x=>x.id!==s.id));flash("Service deleted.");}}}><Trash2 size={15}/></button></div></td></tr>)}{!services.length&&<tr><td colSpan="3" className="empty">Add your first service above.</td></tr>}</Table></Panel>;
}
function Staff({staff,sales,save,flash}) {
 const [name,setName]=useState(""),[rate,setRate]=useState(String(DEFAULT_COMMISSION)),[editing,setEditing]=useState(null);
 const reset=()=>{setName("");setRate(String(DEFAULT_COMMISSION));setEditing(null);};
 const submit=e=>{e.preventDefault();const r=Number(rate);if(!name.trim()||rate===""||!Number.isFinite(r)||r<0||r>100)return alert("Enter a name and commission between 0 and 100%.");save(editing?staff.map(p=>p.id===editing?{...p,name:name.trim(),commissionRate:r}:p):[...staff,{id:uid(),name:name.trim(),commissionRate:r}]);flash(editing?"Staff updated.":"Staff added.");reset();};
 const remove=p=>{if(sales.some(s=>(s.items||[]).some(i=>i.staffId===p.id)))return alert("This staff member has sales records. Edit their details rather than deleting them.");if(confirm(`Remove ${p.name}?`)){save(staff.filter(x=>x.id!==p.id));flash("Staff removed.");}};
 const revenue=p=>sales.reduce((sum,s)=>sum+(s.items||[]).filter(i=>i.staffId===p.id).reduce((a,i)=>a+Number(i.unitPrice)*Number(i.quantity),0),0);
 return <Panel title="Staff & Commission" subtitle="Set an individual commission percentage for each staff member."><form className="formgrid editor" onSubmit={submit}><Field label="Staff name"><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Staff member name"/></Field><Field label="Commission (%)"><input required type="number" min="0" max="100" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></Field><div className="editactions"><button className="btn primary"><Plus size={15}/>{editing?"Save changes":"Add staff"}</button>{editing&&<button type="button" className="btn" onClick={reset}><X size={15}/> Cancel</button>}</div></form><Table headers={["Staff member","Commission rate","Service sales","Actions"]}>{staff.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.commissionRate}%</td><td>{money(revenue(p))}</td><td><div className="inline"><button className="iconbtn" onClick={()=>{setEditing(p.id);setName(p.name);setRate(String(p.commissionRate));}}><Pencil size={15}/></button><button className="iconbtn danger" onClick={()=>remove(p)}><Trash2 size={15}/></button></div></td></tr>)}{!staff.length&&<tr><td colSpan="4" className="empty">Add your first staff member above.</td></tr>}</Table></Panel>;
}
function ReceiptModal({sale,close}) {
 return <div className="overlay"><section className="receipt"><div className="receipthead"><h2>ESSENCE</h2><b>UNISEX SALON & SPA</b><p>SALES RECEIPT</p></div><div className="receiptmeta"><div><span>Receipt</span><b>{sale.receiptNo}</b></div><div><span>Date</span><b>{sale.date}</b></div><div><span>Customer</span><b>{sale.customerName}</b></div><div><span>Payment</span><b>{sale.paymentMethod}</b></div></div><Table headers={["Service / Staff","Qty","Amount"]}>{(sale.items||[]).map((i,n)=><tr key={i.id||n}><td>{i.serviceName}<small className="staffsub">{i.staffName}</small></td><td>{i.quantity}</td><td>{money(i.unitPrice*i.quantity)}</td></tr>)}</Table><div className="totals"><div><span>Subtotal</span><b>{money(sale.subtotal)}</b></div><div><span>Discount</span><b>-{money(sale.discount)}</b></div><div className="grand"><span>Total paid</span><b>{money(sale.total)}</b></div></div><p className="thanks">Thank you for choosing Essence!</p><div className="actions end no-print"><button className="btn" onClick={close}>Close</button><button className="btn primary" onClick={()=>window.print()}><Printer size={15}/> Print receipt</button></div></section></div>;
}

function MonthlyReports({sales,staff}) {
 const currentMonth = new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0");
 const [month,setMonth] = useState(currentMonth);
 const filtered = sales.filter(s => (s.date||"").startsWith(month));
 const sum = key => filtered.reduce((a,s)=>a+Number(s[key]||0),0);
 const totalSales = sum("total");
 const vat = sum("vat");
 const commission = sum("commission");
 const salonBalance = filtered.reduce((a,s)=>a+Math.max(0,Number(s.total||0)-Number(s.vat||0)-Number(s.commission||0)),0);
 const exportReport = () => {
 
  const rows = [
   ["Essence Salon & Spa Monthly Report",month],
   ["Receipt","Date","Customer","Sales","Discount","VAT","Commission","Salon Balance"],
   ...filtered.map(s=>[
    s.receiptNo,s.date,s.customerName,s.total,s.discount,s.vat,s.commission,
    Math.max(0,Number(s.total||0)-Number(s.vat||0)-Number(s.commission||0))
   ])
  ];

  const csv = rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Essence-Monthly-Report-"+month+".csv";
  link.click();
  URL.revokeObjectURL(url);
 };

 const staffTotals = staff.map(p=>{
  let salesTotal=0,commissionTotal=0;
  filtered.forEach(s=>(s.items||[]).filter(i=>i.staffId===p.id).forEach(i=>{
   const line = Number(i.unitPrice||0)*Number(i.quantity||0);
   salesTotal += line;
   commissionTotal += Number(i.commissionAmount??(line*Number(i.commissionRate||p.commissionRate||0)/100));
  }));
  return {...p,salesTotal,commissionTotal};
 });

 return <Panel title="Monthly Reports" subtitle="Review monthly sales, deductions and staff performance.">
  <div className="filters">
   <Field label="Report month"><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></Field>
   <button className="btn primary" onClick={exportReport}><Download size={15}/> Export monthly CSV</button>
  </div>
  <div className="stats">
   <div className="stat"><span>Total sales collected</span><strong>{money(totalSales)}</strong></div>
   <div className="stat"><span>VAT deducted (7.5%)</span><strong>{money(vat)}</strong></div>
   <div className="stat"><span>Staff commission</span><strong>{money(commission)}</strong></div>
   <div className="stat"><span>Salon balance</span><strong>{money(salonBalance)}</strong></div>
  </div>
  <Panel title="Sales transactions" subtitle={month}>
   <Table headers={["Receipt","Date","Customer","Sales","Discount","VAT","Commission","Salon balance"]}>
    {filtered.map(s=><tr key={s.id}>
     <td>{s.receiptNo}</td><td>{s.date}</td><td>{s.customerName}</td>
     <td>{money(s.total)}</td><td>{money(s.discount)}</td><td>{money(s.vat)}</td>
     <td>{money(s.commission)}</td>
     <td>{money(Math.max(0,Number(s.total||0)-Number(s.vat||0)-Number(s.commission||0)))}</td>
    </tr>)}
    {!filtered.length&&<tr><td colSpan="8" className="empty">No sales recorded for this month.</td></tr>}
   </Table>
  </Panel>
  <Panel title="Staff performance" subtitle="Service sales and commission earned during the selected month.">
   <Table headers={["Staff member","Commission rate","Service sales","Commission earned"]}>
    {staffTotals.map(p=><tr key={p.id}>
     <td>{p.name}</td><td>{p.commissionRate}%</td>
     <td>{money(p.salesTotal)}</td><td>{money(p.commissionTotal)}</td>
    </tr>)}
    {!staffTotals.length&&<tr><td colSpan="4" className="empty">No staff members added yet.</td></tr>}
   </Table>
  </Panel>
 </Panel>;
}
createRoot(document.getElementById("root")).render(<React.StrictMode><App/></React.StrictMode>);
