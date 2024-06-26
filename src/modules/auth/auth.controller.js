import jwt from 'jsonwebtoken';
import { UserModel } from './../../../DB/models/user.model.js';
import bcrypt from 'bcrypt';
import { sendEmail } from '../../utls/email.js';
import { customAlphabet } from 'nanoid';

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invaild email' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invaild password' });
        }

        const token = jwt.sign({ id: user._id, role:user.role,status:user.status }, process.env.JWT_SECRET); 
        return res.status(200).json({ message: 'success', token });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const register = async (req, res) => {
    const { username, email, password,phone } = req.body;
    try {
        const user = await UserModel.findOne({ email });
        if (user) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT));
        const newUser = await UserModel.create({ username, email, password: hashedPassword,phone ,role:req.body.role});
        if (!newUser) {
            return res.status(500).json({ message: 'Error while creating user' });
        }
        return res.status(201).json( { message: 'success', newUser });
        await sendEmail(email,`welcome to our online store`,`<h2>Hello ya ${username}</h2>`)
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' }); 
    }
};


export const sendCode = async (req, res) => {
    try {
        const { email } = req.body;
        const code = customAlphabet('1234567890abcdf', 4)();
        const user = await UserModel.findOneAndUpdate({ email }, { sendCode: code }, { new: true });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        await sendEmail({ to: email, subject: "Reset Password", html: `<h2>Code is ${code}</h2>` });

        return res.status(200).json({ message: "Success" });
    } catch (error) {
        console.error("Error sending code:", error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

export const forgetPassword = async (req, res) => {
    const {email,password,code} = req.body;
    const user = await UserModel.findOne({email});
 
    if (!user) {
        return res.status(404).json({ message: "email not found" });
    }

    if(user.sendCode != code){
        return res.status(400).json({ message: "invalid code" });
    }

    user.password = await bcrypt.hash(password,parseInt(process.env.SALT));
    user.sendCode = null;
    await user.save()
    return res.status(200).json({ message: "success" });
}