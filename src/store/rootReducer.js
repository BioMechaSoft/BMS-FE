import { combineReducers } from 'redux';
import authReducer from './authSlice';
import appointmentReducer from './appointmentSlice';
import doctorsReducer from './doctorsSlice';
import messagesReducer from './messagesSlice';
import doctorCreateReducer from './doctorCreateSlice';
import adminCreateReducer from './adminCreateSlice';
import previewReducer from './previewSlice';
import themeReducer from './themeSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  appointment: appointmentReducer,
  doctors: doctorsReducer,
  messages: messagesReducer,
  doctorCreate: doctorCreateReducer,
  adminCreate: adminCreateReducer,
  preview: previewReducer,
  theme: themeReducer,
});

export default rootReducer;
