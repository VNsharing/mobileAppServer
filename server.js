const express = require('express');
const cors = require('cors');
const { client, connectDB } = require('./db');
const bodyParser = require('body-parser');
const moment = require('moment-timezone');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const serviceAccount = require('./fffffff-16c7b-firebase-adminsdk-2llbf-d0f74b95a6.json');       

const app = express();
const transporter = nodemailer.createTransport({
  host: 'sandbox.smtp.mailtrap.io',
  port: '465',
  secure: false,
  auth: {
      user: 'f129515b4b31fe',
      pass: 'a3041707ac4370'
  }
})
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS if needed
app.use(bodyParser.json());

// Import database connection
connectDB();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Define API routes


//get list of employees
app.get('/getAllEmployees', async (req, res) => {
  try {
    const query = `
      SELECT id, name, phone, email, cmnd AS idNumber, birth_date AS dob, address, status
      FROM employees
      ORDER BY id;
    `;
    const result = await client.query(query);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//update employee password (account)
app.patch('/updatePassword', async (req, res) => {
  const { employeeId, newPassword } = req.body;

  if (!employeeId || !newPassword) {
    return res.status(400).json({ error: 'employeeId and newPassword are required' });
  }

  try {
    const query = 'UPDATE employees SET password = $1 WHERE id = $2 RETURNING *';
    const values = [newPassword, employeeId];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//get attendance data (schedule screen)
app.get('/formattedAttendance', async (req, res) => {
  try {
    const query = `
      SELECT e.id as employee_id, e.name, a.status, a.date as datetime, a.color
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id
      ORDER BY e.id, a.date;
    `;
    const result = await client.query(query);

    const employees = {};
    result.rows.forEach(row => {
      if (!employees[row.employee_id]) {
        employees[row.employee_id] = {
          id: row.employee_id,
          name: row.name,
          attendance: []
        };
      }
      employees[row.employee_id].attendance.push({
        status: row.status,
        datetime: row.datetime,
        color: row.color
      });
    });

    res.json(Object.values(employees));
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//insert attendance for an employee (schedule screen)
app.post('/insertAttendance', async (req, res) => {
  const { employee_id, date, status, color } = req.body;

  console.log('Request Body:', req.body);

  if (!employee_id || !date || !status || !color) {
    return res.status(400).json({ error: 'All fields (employee_id, date, status, color) are required' });
  }

  try {
    const query = `
      INSERT INTO attendance (employee_id, date, status, color)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, date)
      DO NOTHING
      RETURNING *;
    `;
    const values = [employee_id, date, status, color];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Attendance record already exists' });
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//update attendance for an employee (schedule screen)
app.patch('/updateAttendance', async (req, res) => {
  const { employee_id, date, status, color } = req.body;

  console.log('Request Body:', req.body);

  if (!employee_id || !date || !status || !color) {
    return res.status(400).json({ error: 'All fields (employee_id, date, status, color) are required' });
  }

  try {
    const query = `
      UPDATE attendance
      SET status = $1, color = $2
      WHERE employee_id = $3 AND date = $4
      RETURNING *;
    `;
    const values = [status, color, employee_id, date];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//ban an employee (employee tab)
app.patch('/banEmployee', async (req, res) => {
  const { employeeId } = req.body;

  try {
    const query = 'UPDATE employees SET status = $1 WHERE id = $2 RETURNING *';
    const values = ['Banned', employeeId];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee status updated to Banned', employee: result.rows[0] });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//unban an employee (employee tab)
app.patch('/unbanEmployee', async (req, res) => {
  const { employeeId } = req.body;

  try {
    const query = 'UPDATE employees SET status = $1 WHERE id = $2 RETURNING *';
    const values = ['Active', employeeId];
    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee status updated to Active', employee: result.rows[0] });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//add a new employee (emloyee tab)
app.post('/addEmployee', async (req, res) => {
  const { name, dob, address, idNumber, phone, email, password, paymentType, amount } = req.body;

  try {

    // Insert new employee
    const insertEmployeeQuery = `
      INSERT INTO employees (name, phone, email, password, cmnd, birth_date, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id;
    `;
    const employeeValues = [name, phone, email, password, idNumber, dob, address];
    const employeeResult = await client.query(insertEmployeeQuery, employeeValues);
    
    const employeeId = employeeResult.rows[0].id;
    
    // Insert salary for the new employee
    const insertSalaryQuery = `
      INSERT INTO salaries (employee_id, type, salaries)
      VALUES ($1, $2, $3);
    `;
    const salaryValues = [employeeId, paymentType, amount];
    await client.query(insertSalaryQuery, salaryValues);
   
    res.status(201).json({ message: 'Employee and salary added successfully', employeeId });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
});

//update employee information (Employee tab)
app.put('/updateEmployeeField', async (req, res) => {
  const { employeeId, field, value } = req.body;

  try {
    let query = '';
    let values = [value, employeeId];

    // Check which field needs to be updated and construct the query accordingly
    switch (field) {
      case 'name':
        query = 'UPDATE employees SET name = $1 WHERE id = $2';
        break;
      case 'dob':
        query = 'UPDATE employees SET birth_date = $1 WHERE id = $2';
        break;
      case 'address':
        query = 'UPDATE employees SET address = $1 WHERE id = $2';
        break;
      case 'idNumber':
        query = 'UPDATE employees SET cmnd = $1 WHERE id = $2';
        break;
      case 'phone':
        query = 'UPDATE employees SET phone = $1 WHERE id = $2';
        break;
      case 'email':
        query = 'UPDATE employees SET email = $1 WHERE id = $2';
        break;
      case 'password':
        query = 'UPDATE employees SET password = $1 WHERE id = $2';
        break;
      case 'paymentType':
        query = 'UPDATE salaries SET type = $1 WHERE employee_id = $2';
        break;
      case 'amount':
        query = 'UPDATE salaries SET salaries = $1 WHERE employee_id = $2';
        break;
      default:
        return res.status(400).json({ error: 'Invalid field' });
    }

    await client.query(query, values);

    res.status(200).json({ message: 'Employee field updated successfully' });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Get account information (account)
app.get('/accountInformation', async (req, res) => {
  const { employeeId } = req.body;

  try {
    // Query to get employee information excluding id and password
    const query = `
      SELECT id, name, phone, email, password, cmnd AS idNumber, birth_date AS dob, address, status
      FROM employees
      WHERE id = $1;
    `;
    const result = await client.query(query, [employeeId]);

    // Check if employee exists
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
});

//calculate salary for month (EmployeeTab)
app.get('/calculateTotalSalaries', async (req, res) => {
  try {
    // Query to calculate total salaries for each employee for each month
    const query = `
      WITH months AS (
        SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') AS month
        FROM attendance
      )
      SELECT 
        m.month,
        e.id AS employee_id,
        e.name,
        COALESCE(s.salaries, 0) AS daily_salary,
        COUNT(a.date) FILTER (WHERE a.status = 'Attended') AS present_days,
        COALESCE(COUNT(a.date) FILTER (WHERE a.status = 'Attended') * s.salaries, 0) AS total_salary
      FROM 
        months m
      CROSS JOIN 
        employees e
      LEFT JOIN 
        salaries s ON e.id = s.employee_id
      LEFT JOIN 
        attendance a ON e.id = a.employee_id AND TO_CHAR(a.date, 'YYYY-MM') = m.month
      GROUP BY 
        m.month, e.id, e.name, s.salaries
      ORDER BY 
        m.month, e.id;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Calculate total salaries for each month
    const monthlySalaries = result.rows.reduce((acc, row) => {
      const { month, employee_id, name, total_salary } = row;

      if (!acc[month]) {
        acc[month] = {
          totalSalaryForMonth: 0,
          employees: [],
        };
      }

      acc[month].totalSalaryForMonth += parseFloat(total_salary);
      acc[month].employees.push({
        employee_id,
        name,
        total_salary,
      });

      return acc;
    }, {});

    res.status(200).json({
      message: 'Total salaries for each month calculated successfully',
      monthlySalaries,
    });
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//check in
app.post('/checkIn', async (req, res) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }

  try {
    const currentDate = moment().tz('Asia/Bangkok').format('YYYY-MM-DD');

    const query = `
      INSERT INTO attendance (employee_id, date, status, color)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, date)
      DO NOTHING
      RETURNING *;
    `;
    const values = [employeeId, currentDate, 'Attended', '#00FF00'];
    const result = await client.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Create the user with Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      emailVerified: false,
      // Set other properties as needed
    });

    // Generate email verification link
    const emailVerificationLink = await admin.auth().generateEmailVerificationLink(email);

    // Send verification email using Nodemailer
    await transporter.sendMail({
      from: 'no-reply@example.com',
      to: email,
      subject: 'Please verify your email address',
      text: `Click the following link to verify your email address: ${emailVerificationLink}`,
    });

    res.status(200).json({
      message: 'User signed up successfully. Verification email sent.',
      userId: userRecord.uid,
      emailVerificationLink
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/loginAdmin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in the local database
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Verify the password
      if (password === user.password) {
        return res.status(200).json({ message: 'Login successful', userId: user.id });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    // If user doesn't exist locally, check Firebase
    try {
      const firebaseUser = await admin.auth().getUserByEmail(email);

      // Check if the email is verified
      if (firebaseUser.emailVerified) {
        // Add the user to the local database
        const insertResult = await client.query(
          'INSERT INTO users (email, password, uid) VALUES ($1, $2, $3) RETURNING id',
          [email, password, firebaseUser.uid]
        );
        return res.status(200).json({ message: 'Email verified. Please login again' }); //return to login page not home page
      } else {
        return res.status(401).json({ message: 'Email not verified' });
      }
    } catch (error) {
      // If the user doesn't exist in Firebase, return an error
      return res.status(404).json({ message: 'Account does not exist' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/loginEmployee', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in the local database
    const result = await client.query('SELECT * FROM employees WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Verify the password
      if (password === user.password) {
        return res.status(200).json({ message: 'Login successful', userId: user.id });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    } else {
      return res.status(404).json({ message: 'Account does not exist' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



// app.get('/testAPI', async (req, res) => {
//   try {
//     const query = `
//       SELECT * FROM employees
//     `;
//     console.log('Received request for /testAPI');
//     const result = await client.query(query);
//     console.log('Query result:', result.rows);

//     res.json(result.rows);
//   } catch (err) {
//     console.error('Error executing query', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });




// app.delete('/deleteEmployee', async (req, res) => {
//   const employeeId = req.body;

//   try {
//     const query = 'DELETE FROM employees WHERE id = $1 RETURNING *';
//     const values = [employeeId];
//     const result = await client.query(query, values);

//     if (result.rowCount === 0) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     res.status(200).json({ message: 'Employee deleted successfully', deletedEmployee: result.rows[0] });
//   } catch (err) {
//     console.error('Error executing query', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


//get data for dailychecker (daily checker)
// app.get('/dailyChecker', async (req, res) => {
//   try {
//     const query = `
//       SELECT e.id AS employee_id, e.name, a.date AS attendance_date, a.status AS attendance_status, a.color AS attendance_color
//       FROM employees e
//       LEFT JOIN attendance a ON e.id = a.employee_id
//       ORDER BY e.id, a.date
//     `;
//     const result = await client.query(query);

//     // Using a Map to group employees
//     const employeeMap = new Map();

//     result.rows.forEach(row => {
//       const { employee_id, name, attendance_date, attendance_status } = row;

//       if (!employeeMap.has(employee_id)) {
//         employeeMap.set(employee_id, { employee_id, name, attendance: [] });
//       }

//       const employee = employeeMap.get(employee_id);
      
//       // Add the attendance record if it exists, otherwise, push a null attendance record
//       if (attendance_date && attendance_status) {
//         employee.attendance.push({ status: attendance_status, datetime: attendance_date });
//       }
//     });

//     // Convert the Map to an array and ensure each employee has at least one null attendance record if none exists
//     const formattedData = Array.from(employeeMap.values()).map(employee => {
//       if (employee.attendance.length === 0) {
//         employee.attendance.push(null);
//       }
//       return employee;
//     });

//     res.json(formattedData);

//   } catch (err) {
//     console.error('Error executing query', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });












