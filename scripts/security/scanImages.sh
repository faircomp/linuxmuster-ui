#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Kevin Stenzel
#
# Reusable Trivy image scanner + Markdown reporter. Shared core for the PR/release
# CI gates and the weekly tracking cron.
#
# Usage:
#   scanImages.sh [--report FILE] [--advisory-grype] IMAGE_REF [IMAGE_REF...]
#   scanImages.sh --self-test [--report FILE]   # scan the base images from the Dockerfiles
#
# Exit code: 0 = no un-ignored HIGH/CRITICAL, 1 = findings (gate result), 2 = usage error.

set -euo pipefail

SEVERITY="HIGH,CRITICAL"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TRIVYIGNORE="${REPO_ROOT}/.trivyignore"
BIN_DIR="${REPO_ROOT}/bin"
TRIVY_INSTALL_URL="https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh"
GRYPE_INSTALL_URL="https://raw.githubusercontent.com/anchore/grype/main/install.sh"

REPORT_FILE=""
SELF_TEST=0
ADVISORY_GRYPE=0
IMAGES=()
TRIVY_BIN=""

usage() {
  grep '^#' "$0" | grep -v '!/usr/bin' | sed 's/^# \{0,1\}//'
}

ensure_trivy() {
  if command -v trivy >/dev/null 2>&1; then
    TRIVY_BIN="trivy"
    return
  fi
  if [[ -x "${BIN_DIR}/trivy" ]]; then
    TRIVY_BIN="${BIN_DIR}/trivy"
    return
  fi
  echo "[*] Trivy not found — installing into ${BIN_DIR}" >&2
  mkdir -p "${BIN_DIR}"
  curl -sfL "${TRIVY_INSTALL_URL}" | sh -s -- -b "${BIN_DIR}" >&2
  TRIVY_BIN="${BIN_DIR}/trivy"
}

dockerfile_base_images() {
  grep -h '^FROM ' "${REPO_ROOT}/apps/api/Dockerfile" "${REPO_ROOT}/apps/frontend/Dockerfile" | awk '{ print $2 }'
}

run_grype_advisory() {
  local image="$1"
  local grype_bin=""
  if command -v grype >/dev/null 2>&1; then
    grype_bin="grype"
  elif [[ -x "${BIN_DIR}/grype" ]]; then
    grype_bin="${BIN_DIR}/grype"
  else
    echo "[*] Grype not found — installing into ${BIN_DIR} (advisory only)" >&2
    mkdir -p "${BIN_DIR}"
    curl -sfL "${GRYPE_INSTALL_URL}" | sh -s -- -b "${BIN_DIR}" >&2 || true
    grype_bin="${BIN_DIR}/grype"
  fi
  echo "[*] Grype advisory scan for ${image} (informational, non-blocking)" >&2
  "${grype_bin}" "${image}" --only-fixed 2>&1 || true
}

main() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --report)
        REPORT_FILE="${2:-}"
        [[ -z "${REPORT_FILE}" ]] && {
          echo "--report requires a FILE argument" >&2
          exit 2
        }
        shift 2
        ;;
      --self-test)
        SELF_TEST=1
        shift
        ;;
      --advisory-grype)
        ADVISORY_GRYPE=1
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      -*)
        echo "Unknown option: $1" >&2
        exit 2
        ;;
      *)
        IMAGES+=("$1")
        shift
        ;;
    esac
  done

  if [[ ${SELF_TEST} -eq 1 ]]; then
    while IFS= read -r base_image; do
      [[ -n "${base_image}" ]] && IMAGES+=("${base_image}")
    done < <(dockerfile_base_images)
  fi

  if [[ ${#IMAGES[@]} -eq 0 ]]; then
    echo "No image refs given (use --self-test or pass IMAGE_REF...)." >&2
    usage
    exit 2
  fi

  ensure_trivy

  local report_body=""
  local overall_rc=0
  local image output rc

  for image in "${IMAGES[@]}"; do
    echo "[*] Scanning ${image} (severity ${SEVERITY})" >&2
    rc=0
    output="$("${TRIVY_BIN}" image --severity "${SEVERITY}" --ignorefile "${TRIVYIGNORE}" --exit-code 1 --no-progress "${image}" 2>&1)" || rc=$?
    printf '%s\n' "${output}"
    if [[ ${rc} -ne 0 ]]; then
      overall_rc=1
    fi

    if [[ ${ADVISORY_GRYPE} -eq 1 ]]; then
      run_grype_advisory "${image}"
    fi

    report_body+="### \`${image}\`"$'\n\n'
    report_body+="Result: $([[ ${rc} -eq 0 ]] && echo 'no un-ignored HIGH/CRITICAL' || echo 'HIGH/CRITICAL found (or scan error)')"$'\n\n'
    report_body+='```'$'\n'"${output}"$'\n''```'$'\n\n'
  done

  if [[ -n "${REPORT_FILE}" ]]; then
    {
      echo "## Security"
      echo
      echo "Trivy image scan (severity ${SEVERITY}, ignorefile \`.trivyignore\`)."
      echo
      printf '%s\n' "${report_body}"
    } >"${REPORT_FILE}"
    echo "[*] Report written to ${REPORT_FILE}" >&2
  fi

  exit "${overall_rc}"
}

main "$@"
