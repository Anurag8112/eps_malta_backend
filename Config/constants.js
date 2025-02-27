export const constants = {
  clientEmail: {
    from: "timesheet@epsmalta.com",
    host: "mx-s5.vivawebhost.com",
    port: 465,
    secure: true, // use SSL/TLS
    auth: {
      user: "timesheet@epsmalta.com",
      pass: "Time_sheet2023",
    },
  },
  whatsapp: {
    phoneNumberId: "377124998823327",
    template_create: "schedule_add",
    template_update: "schedule_update",
    template_delete: "schedule_cancel",
  },
  // testEmail: {
  //   from: "knobs@excel-first.com",
  //   service: "gmail",
  //   auth: {
  //     user: "rahul.pawar@kylient.com",
  //     pass: "diypjyhjqiyqjorj",
  //   },
  // },
};
