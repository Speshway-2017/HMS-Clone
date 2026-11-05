/**
 * Helper utility for doctor-department matching and department name resolution.
 */

/**
 * Checks if a doctor belongs to a selected department ID/Name, strictly excluding
 * unrelated doctors from specialty departments while supporting "all" view.
 */
export function isDoctorInDepartment(
  doc: any,
  selectedDeptId?: string,
  departments: any[] = []
): boolean {
  if (!selectedDeptId || selectedDeptId === "all") return true;
  if (!doc) return false;

  const selectedDeptIdStr = String(selectedDeptId).trim();
  const selectedDeptLower = selectedDeptIdStr.toLowerCase();

  // Find department object if selectedDeptId is an ID or Name
  const selectedDeptObj = departments.find(
    (d: any) =>
      String(d._id || d.id || "") === selectedDeptIdStr ||
      (d.name && String(d.name).trim().toLowerCase() === selectedDeptLower)
  );
  const selectedDeptName = (selectedDeptObj?.name || selectedDeptIdStr).trim().toLowerCase();
  const selectedDeptObjId = selectedDeptObj?._id ? String(selectedDeptObj._id) : (selectedDeptObj?.id ? String(selectedDeptObj.id) : null);

  const docDeptId = typeof doc.department === "object" ? String(doc.department?._id || doc.department?.id || "") : (doc.department ? String(doc.department) : "");
  const docDeptName = typeof doc.department === "object" ? (doc.department?.name || "") : (doc.department ? String(doc.department) : "");
  const docDeptNameLower = docDeptName.trim().toLowerCase();
  const docSpecLower = (doc.specialization || "").trim().toLowerCase();

  // 1. Direct ID match
  if (docDeptId) {
    if (docDeptId === selectedDeptIdStr || (selectedDeptObjId && docDeptId === selectedDeptObjId)) {
      return true;
    }
  }

  // 2. Department Name match (case-insensitive)
  if (docDeptNameLower) {
    if (docDeptNameLower === selectedDeptName || selectedDeptName.includes(docDeptNameLower) || docDeptNameLower.includes(selectedDeptName)) {
      return true;
    }
  }

  // 3. Specialization match
  if (docSpecLower) {
    if (docSpecLower === selectedDeptName || selectedDeptName.includes(docSpecLower) || docSpecLower.includes(selectedDeptName)) {
      return true;
    }
    // Specialty keyword roots
    if (selectedDeptName.includes("cardio") && docSpecLower.includes("cardio")) return true;
    if (selectedDeptName.includes("ortho") && docSpecLower.includes("ortho")) return true;
    if (selectedDeptName.includes("pediatr") && docSpecLower.includes("pediatr")) return true;
    if (selectedDeptName.includes("dermatol") && docSpecLower.includes("dermatol")) return true;
    if (selectedDeptName.includes("surg") && docSpecLower.includes("surg")) return true;
    if (selectedDeptName.includes("general") && (docSpecLower.includes("general") || docSpecLower.includes("physician") || docSpecLower.includes("internal") || docSpecLower.includes("specialist"))) return true;
    if (selectedDeptName.includes("neuro") && docSpecLower.includes("neuro")) return true;
  }

  return false;
}

/**
 * Returns a human-friendly department name for a doctor, falling back to "General / Unassigned"
 * instead of misleading hardcoded strings.
 */
export function getDoctorDepartmentName(doc: any): string {
  if (!doc) return "General / Unassigned";
  if (typeof doc.department === "object" && doc.department?.name) {
    return doc.department.name;
  }
  if (typeof doc.department === "string" && doc.department.trim() !== "") {
    return doc.department;
  }
  if (typeof doc.specialization === "string" && doc.specialization.trim() !== "") {
    return doc.specialization;
  }
  return "General / Unassigned";
}
