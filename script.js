// ================================
// 🔐 PREDEFINED SALES USERS
// ================================
const allowedUsers = [
    { email: "sales1@crm.com", password: "pass101" },
    { email: "sales2@crm.com", password: "pass102" },
    { email: "sales3@crm.com", password: "pass103" },
    { email: "sales4@crm.com", password: "pass104" },
    { email: "sales5@crm.com", password: "pass105" },
    { email: "sales6@crm.com", password: "pass106" },
    { email: "sales7@crm.com", password: "pass107" },
    { email: "sales8@crm.com", password: "pass108" },
    { email: "sales9@crm.com", password: "pass109" },
    { email: "sales10@crm.com", password: "pass110" }
];


// ================================
// 🔐 LOGIN
// ================================
function login(){

    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    let validUser = allowedUsers.find(user =>
        user.email === email && user.password === password
    );

    if(validUser){
        localStorage.setItem("currentUser", email);
        window.location.href = "dashboard.html";
    }
    else{
        alert("Invalid or Unauthorized Sales Person");
    }
}


// ================================
// ➕ ADD CUSTOMER
// ================================
function addCustomer(){

    let name = document.getElementById("name").value;
    let email = document.getElementById("email").value;
    let budget = document.getElementById("budget").value;
    let interest = document.getElementById("interest").value;

    let customers = JSON.parse(localStorage.getItem("customers")) || [];

    email = email.trim().toLowerCase();

    let existing = customers.find(c =>
        c.email && c.email.toLowerCase() === email
    );

    if(existing){
        alert("Customer already exists");
        return;
    }

    let currentUser = localStorage.getItem("currentUser");

    customers.push({
        name,
        email,
        budget: Number(budget),
        interest,
        createdAt: new Date().toLocaleString(),   // ✅ FIX HERE
        createdBy: currentUser,
        status: "active"
    });

    localStorage.setItem("customers", JSON.stringify(customers));

    displayCustomers();
}

// ================================
// 📋 DISPLAY CUSTOMERS
// ================================
function displayCustomers(){

    let table = document.getElementById("customerTable");
    if(!table) return;

    table.innerHTML = "";

    let customers = JSON.parse(localStorage.getItem("customers")) || [];

    customers.forEach(function(customer, index){

        let lead = "";

        if(customer.budget > 70000){
            lead = "Hot Lead 🔥";
        }
        else if(customer.budget >= 30000){
            lead = "Medium Lead 🟡";
        }
        else{
            lead = "Low Lead 🔵";
        }

        let row = table.insertRow();

        row.insertCell(0).innerHTML = customer.name;
        row.insertCell(1).innerHTML = customer.email;
        row.insertCell(2).innerHTML = customer.budget;
        row.insertCell(3).innerHTML = customer.interest;
        row.insertCell(4).innerHTML = lead;
        row.insertCell(5).innerHTML = customer.createdAt;
        row.insertCell(6).innerHTML = customer.createdBy;
        row.insertCell(7).innerHTML = customer.status;

        row.insertCell(8).innerHTML =
        `<button onclick="deleteCustomer(${index})">Delete</button>`;
    });
}


// ================================
// ❌ DELETE CUSTOMER
// ================================
function deleteCustomer(index){

    let customers = JSON.parse(localStorage.getItem("customers")) || [];

    customers.splice(index,1);

    localStorage.setItem("customers", JSON.stringify(customers));

    displayCustomers();
}


// ================================
// 🔍 SEARCH
// ================================
function searchCustomer(){

    let input = document.getElementById("searchInput").value.toLowerCase();

    let rows = document.getElementById("customerTable").getElementsByTagName("tr");

    for(let i=0;i<rows.length;i++){

        let name = rows[i].cells[0].innerText.toLowerCase();

        rows[i].style.display = name.includes(input) ? "" : "none";
    }
}


// ================================
// 🔃 SORT BY NAME
// ================================
function sortByName(){

    let customers = JSON.parse(localStorage.getItem("customers")) || [];

    customers.sort((a,b)=> a.name.localeCompare(b.name));

    localStorage.setItem("customers", JSON.stringify(customers));

    displayCustomers();
}


// ================================
// 🔃 SORT BY BUDGET
// ================================
function sortByBudget(){

    let customers = JSON.parse(localStorage.getItem("customers")) || [];

    customers.sort((a,b)=> a.budget - b.budget);

    localStorage.setItem("customers", JSON.stringify(customers));

    displayCustomers();
}


// ================================
// 📊 DASHBOARD
// ================================
function loadDashboard(){

    let customers = JSON.parse(localStorage.getItem("customers")) || [];

    let totalCustomers = customers.length;
    let hotLeads = 0;
    let totalSales = 0;

    customers.forEach(c => {
        totalSales += Number(c.budget);
        if(c.budget > 70000) hotLeads++;
    });

    document.getElementById("totalCustomers").innerText = totalCustomers;
    document.getElementById("hotLeads").innerText = hotLeads;
    document.getElementById("pendingFollowups").innerText = totalCustomers;
    document.getElementById("totalSales").innerText = "₹" + totalSales;
}


// ================================
// 🚀 AUTO LOAD
// ================================
window.onload = function(){

    // =========================
    // 👥 CUSTOMER PAGE LOAD
    // =========================
    if(document.getElementById("customerTable")){
        displayCustomers();
    }

    // =========================
    // 📊 DASHBOARD LOAD
    // =========================
    if(document.getElementById("totalCustomers")){
        loadDashboard();

        // show logged in user
        let user = localStorage.getItem("currentUser");

        if(document.getElementById("userEmail")){
            document.getElementById("userEmail").innerText = user;
        }
    }

    let currentUser = localStorage.getItem("currentUser");

    if(!currentUser && 
       (document.getElementById("customerTable") || document.getElementById("totalCustomers"))){

        alert("Please login first");
        window.location.href = "index.html";
    }
};