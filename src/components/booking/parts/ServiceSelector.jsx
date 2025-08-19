function ServiceSelector({ selectedService, onSelect, t }) {
  const services = [
    { id: "cut", name: t("haircut"), icon: "💇‍♂️" },
    { id: "beard", name: t("beard_trim"), icon: "🧔" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {services.map((service) => {
        const isSelected = selectedService === service.id;

        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service.id)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200
              ${
                isSelected
                  ? "bg-gold text-primary border-gold shadow-md scale-105"
                  : "bg-white text-gray-800 border-gray-300 hover:border-gold hover:shadow"
              }`}
          >
            {/* أيقونة */}
            <span className="text-4xl mb-2">{service.icon}</span>

            {/* اسم الخدمة */}
            <span className="text-base font-medium">{service.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ServiceSelector;
