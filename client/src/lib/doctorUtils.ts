/**
 * Helper utility for doctor-department matching and department name resolution.
 */

/**
 * Checks if a doctor belongs to a selected department ID/Name, or if they have no
 * specific department assigned (making them available as a general/all-department consultant).
 */
export function isDoctorInDepartment(
  doc: any,
  selectedDeptId?: string,
  departments: any[] = []
): boolean {
  if (!selectedDeptId) return true;
  if (!doc) return false;

  // If doctor has no department assigned in DB, treat as general/unassigned consultant available for selection
  if (!doc.department) return true;

  const docDeptId = typeof doc.department === "object" ? doc.department?._id?.toString() : doc.department?.toString();
  const docDeptName = typeof doc.department === "object" ? doc.department?.name : doc.department;

  const selectedDeptObj = departments.find(
    (d: any) => d._id?.toString() === selectedDeptId || d._id === selectedDeptId
  );
  const selectedDeptName = selectedDeptObj?.name;

  // 1. Direct ID match
  if (docDeptId && docDeptId === selectedDeptId) return true;

  // 2. Department Name match (case-insensitive)
  if (docDeptName && selectedDeptName && docDeptName.trim().toLowerCase() === selectedDeptName.trim().toLowerCase()) {
    return true;
  }
  if (docDeptName && docDeptName.trim().toLowerCase() === selectedDeptId.trim().toLowerCase()) {
    return true;
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
  return "General / Unassigned";
}
