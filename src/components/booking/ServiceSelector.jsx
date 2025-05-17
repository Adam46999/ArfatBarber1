function ServiceSelector({ value, onChange, options }) {
  return (
    <select
      name="service"
      value={value}
      onChange={onChange}
      required
      className="w-full border border-gray-300 p-3 rounded-md"
    >
      <option value="">{options.placeholder}</option>
      <option value="Haircut">{options.haircut}</option>
      <option value="Beard Trim">{options.beard}</option>
      <option value="Haircut & Beard">{options.combo}</option>
    </select>
  );
}

export default ServiceSelector;
