import React, { useContext, useState } from "react";
import { TiHome } from "react-icons/ti";
import { RiLogoutBoxFill } from "react-icons/ri";
import { AiFillMessage } from "react-icons/ai";
import { BiBarChart } from "react-icons/bi";
import { GiHamburgerMenu } from "react-icons/gi";
import { FaUserDoctor } from "react-icons/fa6";
import { FaUserNurse, FaUserPlus } from "react-icons/fa";
import { IoPersonAddSharp } from "react-icons/io5";
// import { FaPrescription } from "react-icons/fa6";
import { FiSettings } from "react-icons/fi";

import api from "../utils/api";
import { toast } from "react-toastify";
import { Context } from "../main";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const [show, setShow] = useState(false);

  const { isAuthenticated, setIsAuthenticated } = useContext(Context);
  const { admin } = useContext(Context);
  const role = admin?.role || admin?.userRole || 'Admin';

  const handleLogout = async () => {
    try {
      const res = await api.get(`/api/v1/user/admin/logout`);
      // Clear all cookies
      document.cookie.split(';').forEach((c) => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
      });
      toast.success(res.data.message);
      setIsAuthenticated(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Logout failed');
    }
  };

  const navigateTo = useNavigate();

  const gotoHomePage = () => {
    navigateTo("/");
    setShow(!show);
  };
  const gotoDoctorsPage = () => {
    navigateTo("/doctors");
    setShow(!show);
  };
  const gotoMessagesPage = () => {
    navigateTo("/messages");
    setShow(!show);
  };
  const gotoReportsPage = () => {
    navigateTo('/reports');
    setShow(!show);
  }
  const gotoAddNewDoctor = () => {
    navigateTo("/doctor/addnew");
    setShow(!show);
  };
  const gotoAddNewAdmin = () => {
    navigateTo("/admin/addnew");
    setShow(!show);
  };
  const gotoCompoundersPage = () => {
    navigateTo('/compounders');
    setShow(!show);
  }
  // const prescriptionPage = () => {
  //   navigateTo("/prescription");
  // }
  const gotoSettingsPage = () => {
    navigateTo("/settings");
    setShow(!show);
  }

  return (
    <>
      <nav
        style={!isAuthenticated ? { display: "none" } : { display: "flex" }}
        className={show ? "show sidebar" : "sidebar"}
      >
        <div className="links">
          <TiHome onClick={gotoHomePage} />
          {/* Doctors & Admin can view doctors list */}
          {(role === 'Admin' || role === 'Doctor') && <FaUserDoctor onClick={gotoDoctorsPage} />}
          {/* Admin and Doctor can create compounder */}
          {(role === 'Admin' || role === 'Doctor') && (
            <>
              <FaUserPlus onClick={gotoAddNewAdmin} title="Create Compounder" />
              <FaUserNurse onClick={gotoCompoundersPage} title="Compounders" />
            </>
          )}
          {/* Only Admin can add new doctors */}
          {role === 'Admin' && <IoPersonAddSharp onClick={gotoAddNewDoctor} />}
          {/* Messages and Prescriptions available to Admin, Doctor, Compounder */}
          {(["Admin","Doctor","Compounder"].includes(role)) && <AiFillMessage onClick={gotoMessagesPage} />}
          {(["Admin","Doctor","Compounder"].includes(role)) && <BiBarChart onClick={gotoReportsPage} />}
          {/* {(["Admin","Doctor","Compounder"].includes(role)) && <FaPrescription onClick={prescriptionPage} />} */}
          {/* Settings: Admin and Doctor have access to settings */}
          {(["Admin","Doctor"].includes(role)) && <FiSettings onClick={gotoSettingsPage} />}
          <RiLogoutBoxFill onClick={handleLogout} />
        </div>
      </nav>
      <div
        className="wrapper"
        style={!isAuthenticated ? { display: "none" } : { display: "flex" }}
      >
        <GiHamburgerMenu className="hamburger" onClick={() => setShow(!show)} />
      </div>
    </>
  );
};

export default Sidebar;
