import qs from "querystring";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { gql, useLazyQuery, useQuery } from "@apollo/client";
import React, {
  ChangeEventHandler,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import moment from "moment";
import classnames from "classnames";
import { faSlidersH } from "@fortawesome/free-solid-svg-icons";
import { DatePicker, Label } from "@trussworks/react-uswds";
import { useSelector } from "react-redux";

import { PATIENT_TERM_CAP } from "../../config/constants";
import { displayFullName } from "../utils";
import { formatDateWithTimeOption, isValidDate } from "../utils/date";
import { ActionsMenu } from "../commonComponents/ActionsMenu";
import { getParameterFromUrl, getUrl } from "../utils/url";
import { useDocumentTitle, useOutsideClick } from "../utils/hooks";
import Pagination from "../commonComponents/Pagination";
import {
  COVID_RESULTS,
  ROLE_VALUES,
  TEST_RESULT_DESCRIPTIONS,
} from "../constants";
import "./TestResultsList.scss";
import Button from "../commonComponents/Button/Button";
import { useDebounce } from "../testQueue/addToQueue/useDebounce";
import {
  MIN_SEARCH_CHARACTER_COUNT,
  SEARCH_DEBOUNCE_TIME,
} from "../testQueue/constants";
import SearchInput from "../testQueue/addToQueue/SearchInput";
import { QUERY_PATIENT } from "../testQueue/addToQueue/AddToQueueSearch";
import { Patient } from "../patients/ManagePatients";
import SearchResults from "../testQueue/addToQueue/SearchResults";
import Select from "../commonComponents/Select";
import { useSelectedFacility } from "../facilitySelect/useSelectedFacility";

import TestResultPrintModal from "./TestResultPrintModal";
import TestResultTextModal from "./TestResultTextModal";
import EmailTestResultModal from "./EmailTestResultModal";
import TestResultCorrectionModal from "./TestResultCorrectionModal";
import TestResultDetailsModal from "./TestResultDetailsModal";
import DownloadResultsCSVButton from "./DownloadResultsCsvButton";

export type Results = keyof typeof TEST_RESULT_DESCRIPTIONS;

export const byDateTested = (a: any, b: any) => {
  // ISO string dates sort nicely
  if (a.dateTested === b.dateTested) return 0;
  if (a.dateTested < b.dateTested) return 1;
  return -1;
};

function testResultRows(
  testResults: any,
  setPrintModalId: SetStateAction<any>,
  setMarkCorrectionId: SetStateAction<any>,
  setDetailsModalId: SetStateAction<any>,
  setTextModalId: SetStateAction<any>,
  setEmailModalTestResultId: SetStateAction<any>
) {
  if (testResults.length === 0) {
    return (
      <tr>
        <td>No results</td>
      </tr>
    );
  }

  // `sort` mutates the array, so make a copy
  return [...testResults].sort(byDateTested).map((r) => {
    const actionItems = [];
    actionItems.push({
      name: "Print result",
      action: () => setPrintModalId(r.internalId),
    });
    if (r.patient.email) {
      actionItems.push({
        name: "Email result",
        action: () => setEmailModalTestResultId(r.internalId),
      });
    }
    actionItems.push({
      name: "Text result",
      action: () => setTextModalId(r.internalId),
    });

    const removed = r.correctionStatus === "REMOVED";
    if (!removed) {
      actionItems.push({
        name: "Correct result",
        action: () => setMarkCorrectionId(r.internalId),
      });
    }
    actionItems.push({
      name: "View details",
      action: () => setDetailsModalId(r.internalId),
    });
    return (
      <tr
        key={r.internalId}
        title={removed ? "Marked as error" : ""}
        className={classnames(
          "sr-test-result-row",
          removed && "sr-test-result-row--removed"
        )}
        data-patient-link={
          r.patientLink
            ? `${getUrl()}pxp?plid=${r.patientLink.internalId}`
            : null
        }
      >
        <td className="patient-name-cell">
          {displayFullName(
            r.patient.firstName,
            r.patient.middleName,
            r.patient.lastName
          )}
          <span className="display-block text-base font-ui-2xs">
            DOB: {formatDateWithTimeOption(r.patient.birthDate)}
          </span>
        </td>
        <td className="test-date-cell">
          {formatDateWithTimeOption(r.dateTested, true)}
        </td>
        <td className="test-result-cell">
          {TEST_RESULT_DESCRIPTIONS[r.result as Results]}
        </td>
        <td className="test-facility-cell">{r.facility.name}</td>
        <td className="test-device-cell">{r.deviceType.name}</td>
        <td className="submitted-by-cell">
          {displayFullName(
            r.createdBy.nameInfo.firstName,
            null,
            r.createdBy.nameInfo.lastName
          )}
        </td>
        <td className="actions-cell">
          <ActionsMenu items={actionItems} />
        </td>
      </tr>
    );
  });
}

export type FilterParams = {
  patientId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  role?: string | null;
  result?: string | null;
  filterFacilityId?: string | null;
};

interface DetachedTestResultsListProps {
  data: any;
  refetch: () => void;
  loading: boolean;
  loadingTotalResults: boolean;
  pageNumber: number;
  entriesPerPage: number;
  totalEntries: number;
  filterParams: FilterParams;
  setFilterParams: (filter: keyof FilterParams) => (val: string | null) => void;
  clearFilterParams: () => void;
  activeFacilityId: string;
}

const getResultCountText = (
  totalEntries: number,
  pageNumber: number,
  entriesPerPage: number
) => {
  const from = totalEntries === 0 ? 0 : (pageNumber - 1) * entriesPerPage + 1;
  const to = Math.min(entriesPerPage * pageNumber, totalEntries);

  return `Showing ${from}-${to} of ${totalEntries}`;
};

const getFilteredPatientName = (params: FilterParams, data: any) => {
  const person = data?.testResults[0]?.patient;
  if (params.patientId && person) {
    return displayFullName(
      person.firstName,
      person.middleName,
      person.lastName
    );
  }
  return null;
};

export const DetachedTestResultsList = ({
  data,
  refetch,
  pageNumber,
  entriesPerPage,
  loading,
  loadingTotalResults,
  totalEntries,
  activeFacilityId,
  filterParams,
  setFilterParams,
  clearFilterParams,
}: DetachedTestResultsListProps) => {
  const [printModalId, setPrintModalId] = useState(undefined);
  const [markCorrectionId, setMarkCorrectionId] = useState(undefined);
  const [detailsModalId, setDetailsModalId] = useState<string>();
  const [textModalId, setTextModalId] = useState<string>();
  const [
    emailModalTestResultId,
    setEmailModalTestResultId,
  ] = useState<string>();
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [startDateError, setStartDateError] = useState<string | undefined>();
  const [endDateError, setEndDateError] = useState<string | undefined>();
  const [resetCount, setResetCount] = useState<number>(0);

  const [queryString, debounced, setDebounced] = useDebounce("", {
    debounceTime: SEARCH_DEBOUNCE_TIME,
    runIf: (q) => q.length >= MIN_SEARCH_CHARACTER_COUNT,
  });

  const validFacilities = useSelector(
    (state) => ((state as any).facilities as Facility[]) || []
  );

  const allowQuery = debounced.length >= MIN_SEARCH_CHARACTER_COUNT;

  const [
    queryPatients,
    { data: patientData, loading: patientLoading },
  ] = useLazyQuery(QUERY_PATIENT, {
    fetchPolicy: "no-cache",
    variables: {
      facilityId: filterParams.filterFacilityId || activeFacilityId,
      namePrefixMatch: queryString,
    },
  });

  useEffect(() => {
    if (queryString.trim() !== "") {
      queryPatients();
    }
  }, [queryString, queryPatients]);

  useEffect(() => {
    if (!filterParams.patientId) {
      setDebounced("");
    }
  }, [filterParams, setDebounced]);

  useEffect(() => {
    const patientName = getFilteredPatientName(filterParams, data);
    if (patientName) {
      setDebounced(patientName);
      setShowSuggestion(false);
    }
  }, [filterParams, data, setDebounced]);

  const onInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.value === "") {
      setFilterParams("patientId")(null);
    }
    setShowSuggestion(true);
    if (event.target.value !== queryString) {
      setDebounced(event.target.value);
    }
  };

  const onPatientSelect = (patient: Patient) => {
    setFilterParams("patientId")(patient.internalId);
    setDebounced(
      displayFullName(patient.firstName, patient.middleName, patient.lastName)
    );
    setShowSuggestion(false);
  };

  const dropDownRef = useRef(null);
  const showDropdown = useMemo(() => allowQuery && showSuggestion, [
    allowQuery,
    showSuggestion,
  ]);
  const hideOnOutsideClick = useCallback(() => {
    setShowSuggestion(false);
  }, []);

  useOutsideClick(dropDownRef, hideOnOutsideClick);

  if (printModalId) {
    return (
      <TestResultPrintModal
        testResultId={printModalId}
        closeModal={() => setPrintModalId(undefined)}
      />
    );
  }
  if (textModalId) {
    return (
      <TestResultTextModal
        testResultId={textModalId}
        closeModal={() => setTextModalId(undefined)}
      />
    );
  }
  if (emailModalTestResultId) {
    return (
      <EmailTestResultModal
        testResultId={emailModalTestResultId}
        closeModal={() => setEmailModalTestResultId(undefined)}
      />
    );
  }
  if (markCorrectionId) {
    return (
      <TestResultCorrectionModal
        testResultId={markCorrectionId}
        closeModal={() => {
          setMarkCorrectionId(undefined);
          refetch();
        }}
      />
    );
  }

  const testResults = data?.testResults || [];

  const rows = testResultRows(
    testResults,
    setPrintModalId,
    setMarkCorrectionId,
    setDetailsModalId,
    setTextModalId,
    setEmailModalTestResultId
  );

  const processStartDate = (value: string | undefined) => {
    if (value) {
      if (!isValidDate(value, true)) {
        setStartDateError("Date must be in format MM/DD/YYYY");
      } else {
        const startDate = moment(value, "MM/DD/YYYY").startOf("day");
        setStartDateError(undefined);
        setFilterParams("startDate")(startDate.toISOString());
      }
    } else {
      setFilterParams("startDate")("");
    }
  };

  const processEndDate = (value: string | undefined) => {
    if (value) {
      if (!isValidDate(value)) {
        setEndDateError("Date must be in format MM/DD/YYYY");
      } else {
        const endDate = moment(value, "MM/DD/YYYY").endOf("day");
        if (
          isValidDate(filterParams.startDate || "") &&
          endDate.isBefore(moment(filterParams.startDate))
        ) {
          setEndDateError("End date cannot be before start date");
          setFilterParams("endDate")("");
        } else {
          setEndDateError(undefined);
          setFilterParams("endDate")(endDate.toISOString());
        }
      }
    } else {
      setFilterParams("endDate")("");
    }
  };

  return (
    <main className="prime-home">
      {detailsModalId && (
        <TestResultDetailsModal
          testResultId={detailsModalId}
          closeModal={() => {
            setDetailsModalId(undefined);
          }}
        />
      )}
      <div className="grid-container results-wide-container">
        <div className="grid-row">
          <div className="prime-container card-container sr-test-results-list">
            <div className="usa-card__header">
              <h2>
                Test results
                {!loadingTotalResults && (
                  <span className="sr-showing-results-on-page">
                    {getResultCountText(
                      totalEntries,
                      pageNumber,
                      entriesPerPage
                    )}
                  </span>
                )}
              </h2>
              <div>
                <DownloadResultsCSVButton
                  filterParams={filterParams}
                  totalEntries={totalEntries}
                  facilityId={filterParams.filterFacilityId || activeFacilityId}
                />
                <Button
                  className="sr-active-button"
                  icon={faSlidersH}
                  onClick={() => {
                    setDebounced("");
                    clearFilterParams();
                    // The DatePicker component contains bits of state that represent the selected date
                    // as represented internally to the component and displayed externally to the DOM. Directly
                    // changing the value of the date via props does not cause the internal state to be updated.
                    // This hack forces the DatePicker component to be fully re-mounted whenever the filters are
                    // cleared, therefore resetting the external date display.
                    setResetCount(resetCount + 1);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
            <div
              id="test-results-search-by-patient-input"
              className="position-relative bg-base-lightest"
            >
              <div className="display-flex grid-row grid-gap flex-row flex-align-end padding-x-3 padding-y-2">
                <div className="person-search">
                  <SearchInput
                    onInputChange={onInputChange}
                    queryString={debounced}
                    disabled={!allowQuery}
                    label={"Search by name"}
                    placeholder={""}
                    className="usa-form-group search-input_without_submit_button"
                    showSubmitButton={false}
                  />
                  <SearchResults
                    page="test-results"
                    patients={patientData?.patients || []}
                    onPatientSelect={onPatientSelect}
                    shouldShowSuggestions={showDropdown}
                    loading={debounced !== queryString || patientLoading}
                    dropDownRef={dropDownRef}
                  />
                </div>
                <div className="usa-form-group date-filter-group">
                  <Label htmlFor="start-date">Date range (start)</Label>
                  {startDateError && (
                    <span className="usa-error-message" role="alert">
                      <span className="usa-sr-only">Error: </span>
                      {startDateError}
                    </span>
                  )}
                  <DatePicker
                    id="start-date"
                    key={resetCount}
                    name="start-date"
                    defaultValue={filterParams.startDate || ""}
                    data-testid="start-date"
                    minDate="2000-01-01T00:00"
                    maxDate={moment().format("YYYY-MM-DDThh:mm")}
                    onChange={processStartDate}
                  />
                </div>
                <div className="usa-form-group date-filter-group">
                  <Label htmlFor="end-date">Date range (end)</Label>
                  {endDateError && (
                    <span className="usa-error-message" role="alert">
                      <span className="usa-sr-only">Error: </span>
                      {endDateError}
                    </span>
                  )}
                  <DatePicker
                    id="end-date"
                    key={resetCount + 1}
                    name="end-date"
                    defaultValue={filterParams.endDate || ""}
                    data-testid="end-date"
                    minDate={filterParams.startDate || "2000-01-01T00:00"}
                    maxDate={moment().format("YYYY-MM-DDThh:mm")}
                    onChange={processEndDate}
                  />
                </div>
                <Select
                  label="Test result"
                  name="result"
                  value={filterParams.result || ""}
                  options={[
                    {
                      value: COVID_RESULTS.POSITIVE,
                      label: TEST_RESULT_DESCRIPTIONS.POSITIVE,
                    },
                    {
                      value: COVID_RESULTS.NEGATIVE,
                      label: TEST_RESULT_DESCRIPTIONS.NEGATIVE,
                    },
                    {
                      value: COVID_RESULTS.INCONCLUSIVE,
                      label: TEST_RESULT_DESCRIPTIONS.UNDETERMINED,
                    },
                  ]}
                  defaultSelect
                  onChange={setFilterParams("result")}
                />
                <Select
                  label="Role"
                  name="role"
                  value={filterParams.role || ""}
                  options={ROLE_VALUES}
                  defaultSelect
                  onChange={setFilterParams("role")}
                />
                {validFacilities && validFacilities.length > 1 ? (
                  <Select
                    label="Testing facility"
                    name="facility"
                    value={filterParams.filterFacilityId || activeFacilityId}
                    options={validFacilities.map((facility) => {
                      return {
                        value: facility.id,
                        label: facility.name,
                      };
                    })}
                    onChange={setFilterParams("filterFacilityId")}
                  />
                ) : null}
              </div>
            </div>
            <div className="usa-card__body" title="filtered-result">
              <table className="usa-table usa-table--borderless width-full">
                <thead>
                  <tr>
                    <th scope="col" className="patient-name-cell">
                      {PATIENT_TERM_CAP}
                    </th>
                    <th scope="col" className="test-date-cell">
                      Test date
                    </th>
                    <th scope="col" className="test-result-cell">
                      COVID-19
                    </th>
                    <th scope="col" className="test-facility-cell">
                      Testing facility
                    </th>
                    <th scope="col" className="test-device-cell">
                      Test device
                    </th>
                    <th scope="col" className="submitted-by-cell">
                      Submitted by
                    </th>
                    <th scope="col" className="actions-cell">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>{rows}</tbody>
              </table>
            </div>
            <div className="usa-card__footer">
              {loading ? (
                <p>Loading...</p>
              ) : (
                <Pagination
                  baseRoute="/results"
                  currentPage={pageNumber}
                  entriesPerPage={entriesPerPage}
                  totalEntries={totalEntries}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export const resultsCountQuery = gql`
  query GetResultsCountByFacility(
    $facilityId: ID
    $patientId: ID
    $result: String
    $role: String
    $startDate: DateTime
    $endDate: DateTime
  ) {
    testResultsCount(
      facilityId: $facilityId
      patientId: $patientId
      result: $result
      role: $role
      startDate: $startDate
      endDate: $endDate
    )
  }
`;

export const testResultQuery = gql`
  query GetFacilityResults(
    $facilityId: ID
    $patientId: ID
    $result: String
    $role: String
    $startDate: DateTime
    $endDate: DateTime
    $pageNumber: Int
    $pageSize: Int
  ) {
    testResults(
      facilityId: $facilityId
      patientId: $patientId
      result: $result
      role: $role
      startDate: $startDate
      endDate: $endDate
      pageNumber: $pageNumber
      pageSize: $pageSize
    ) {
      internalId
      dateTested
      result
      correctionStatus
      deviceType {
        internalId
        name
      }
      patient {
        internalId
        firstName
        middleName
        lastName
        birthDate
        gender
        lookupId
        email
      }
      createdBy {
        nameInfo {
          firstName
          lastName
        }
      }
      patientLink {
        internalId
      }
      facility {
        name
      }
    }
  }
`;

export interface ResultsQueryVariables {
  patientId?: string | null;
  facilityId: string;
  result?: string | null;
  role?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  pageNumber: number;
  pageSize: number;
}

const TestResultsList = () => {
  useDocumentTitle("Results");
  const urlParams = useParams();

  const [facility] = useSelectedFacility();
  const activeFacilityId = facility?.id || "";

  const navigate = useNavigate();
  const location = useLocation();

  const patientId = getParameterFromUrl("patientId", location);
  const startDate = getParameterFromUrl("startDate", location);
  const endDate = getParameterFromUrl("endDate", location);
  const role = getParameterFromUrl("role", location);
  const result = getParameterFromUrl("result", location);
  const filterFacilityId = getParameterFromUrl("filterFacilityId", location);

  const queryParams = {
    ...(patientId && { patientId: patientId }),
    ...(startDate && { startDate: startDate }),
    ...(endDate && { endDate: endDate }),
    ...(result && { result: result }),
    ...(role && { role: role }),
  };

  const filterParams: FilterParams = {
    ...queryParams,
    ...(filterFacilityId && { filterFacilityId: filterFacilityId }),
  };

  const filter = (params: FilterParams) => {
    navigate({
      pathname: "/results/1",
      search: qs.stringify({
        facility: activeFacilityId,
        ...filterParams,
        ...params,
      }),
    });
  };

  const setFilterParams = (key: keyof FilterParams) => (val: string | null) => {
    filter({ [key]: val });
  };

  const refetch = () => navigate(0);

  const clearFilterParams = () =>
    navigate({
      pathname: "/results/1",
      search: qs.stringify({ facility: activeFacilityId }),
    });

  const entriesPerPage = 20;
  const pageNumber = Number(urlParams.pageNumber) || 1;

  const resultsQueryVariables: ResultsQueryVariables = {
    facilityId: filterFacilityId || activeFacilityId,
    pageNumber: pageNumber - 1,
    pageSize: entriesPerPage,
    ...queryParams,
  };
  const countQueryVariables: {
    patientId?: string | null;
    facilityId: string;
    result?: string | null;
    role?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  } = {
    facilityId: filterFacilityId || activeFacilityId,
    ...queryParams,
  };

  const count = useQuery(resultsCountQuery, {
    fetchPolicy: "no-cache",
    variables: countQueryVariables,
  });
  const results = useQuery(testResultQuery, {
    fetchPolicy: "no-cache",
    variables: resultsQueryVariables,
  });

  if (!activeFacilityId) {
    return <div>"No facility selected"</div>;
  }

  if (results.error || count.error) {
    throw results.error || count.error;
  }

  const totalEntries = count.data?.testResultsCount || 0;

  return (
    <DetachedTestResultsList
      data={results.data}
      loading={results.loading}
      pageNumber={pageNumber}
      loadingTotalResults={count.loading}
      entriesPerPage={entriesPerPage}
      totalEntries={totalEntries}
      filterParams={filterParams}
      setFilterParams={setFilterParams}
      clearFilterParams={clearFilterParams}
      activeFacilityId={activeFacilityId}
      refetch={refetch}
    />
  );
};

export default TestResultsList;
