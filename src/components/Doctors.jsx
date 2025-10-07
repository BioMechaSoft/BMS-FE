import api from "../utils/api";
import React, { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Context } from "../main";
import { Navigate } from "react-router-dom";

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const { isAuthenticated } = useContext(Context);
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const { data } = await api.get(`/api/v1/user/doctors`);
        setDoctors(data.doctors);
      } catch (error) {
        toast.error(error.response.data.message);
      }
    };
    fetchDoctors();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to={"/login"} />;
  }
  return (
    <section className="page doctors">
      <h1>DOCTORS</h1>
      <div className="banner">
        {doctors && doctors.length > 0 ? (
          doctors.map((element) => {
            return (
              <div class="doc-card">
                <div class="doc-card__inner">
                  <div class="doc-card__avatar">
                    <img src={element.docAvatar && element.docAvatar.url?element.docAvatar && element.docAvatar.url:'./doc1.jpg'}
                    alt="doctor avatar" />
                  </div>

                  <h3 class="doc-card__name">{`${element.firstName} ${element.lastName}`}</h3>
                  <p class="doc-card__role">NIC: {element.nic}</p>

                  <div class="doc-card__info">
                    <p>
                      <span class="label">Email:</span> {element.email}
                    </p>
                    <p>
                      <span class="label">Phone:</span> {element.phone}
                    </p>
                    <p>
                      <span class="label">DOB:</span> {element.dob.substring(0, 10)}
                    </p>
                  </div>

                  <div class="doc-card__actions">
                    <div class="doc-btn btn--primary">{element.doctorDepartment}</div>
                    <div class="doc-btn btn--ghost">{element.gender}</div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <h1>No Registered Doctors Found!</h1>
        )}
      </div>
    </section>
  );
};

export default Doctors;
