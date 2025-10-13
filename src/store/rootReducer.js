import { combineReducers } from 'redux';
import authReducer from './authSlice';
import appointmentReducer from './appointmentSlice';
import doctorsReducer from './doctorsSlice';
import messagesReducer from './messagesSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  appointment: appointmentReducer,
  doctors: doctorsReducer,
  messages: messagesReducer,
});

export default rootReducer;
