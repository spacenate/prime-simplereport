import { ChangeEvent, useState, useEffect } from "react";
import { useSelector } from "react-redux";

import { DatePicker } from "../commonComponents/DatePicker";
import Dropdown from "../commonComponents/Dropdown";
import { useGetTopLevelDashboardMetricsNewQuery } from "../../generated/graphql";
import { LoadingCard } from "../commonComponents/LoadingCard/LoadingCard";

import "./Analytics.scss";

const getDateFromDaysAgo = (daysAgo: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

export const setStartTimeForDateRange = (date: Date): Date => {
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  return date;
};

export const setEndTimeForDateRange = (date: Date): Date => {
  date.setHours(23);
  date.setMinutes(59);
  date.setSeconds(59);
  return date;
};

export const getStartDateFromDaysAgo = (daysAgo: number): Date => {
  const newDate = getDateFromDaysAgo(daysAgo);
  return setStartTimeForDateRange(newDate);
};

export const getStartDateStringFromDaysAgo = (daysAgo: number): string => {
  const newDate = getStartDateFromDaysAgo(daysAgo);
  return newDate.toLocaleDateString();
};

export const getEndDateFromDaysAgo = (daysAgo: number): Date => {
  const newDate = getDateFromDaysAgo(daysAgo);
  return setEndTimeForDateRange(newDate);
};

export const getEndDateStringFromDaysAgo = (daysAgo: number): string => {
  const newDate = getEndDateFromDaysAgo(daysAgo);
  return newDate.toLocaleDateString();
};

interface Props {
  startDate?: string;
  endDate?: string;
}

export const Analytics = (props: Props) => {
  const organization = useSelector(
    (state) => (state as any).organization as Organization
  );
  const facilities = useSelector(
    (state) => ((state as any).facilities as Facility[]) || []
  );
  const [facilityId, setFacilityId] = useState<string>("");
  const [facilityName, setFacilityName] = useState<string>(organization.name);
  const [dateRange, setDateRange] = useState<string>("week");
  const [startDate, setStartDate] = useState<string>(
    props.startDate || getStartDateStringFromDaysAgo(7)
  );
  const [endDate, setEndDate] = useState<string>(
    props.endDate || getEndDateStringFromDaysAgo(0)
  );

  useEffect(() => {
    const startInput = document.getElementById("startDate") as HTMLInputElement;
    const endInput = document.getElementById("endDate") as HTMLInputElement;
    if (startInput) {
      startInput.value = startDate;
    }
    if (endInput) {
      endInput.value = endDate;
    }
  });

  const updateFacility = ({
    target: { value },
  }: ChangeEvent<HTMLSelectElement>) => {
    const facilityName =
      facilities.find((f) => f.id === value)?.name || "All facilities";
    setFacilityId(value);
    setFacilityName(facilityName);
  };

  const updateDateRange = ({
    target: { value },
  }: ChangeEvent<HTMLSelectElement>) => {
    setDateRange(value);
    switch (value) {
      case "day":
        setStartDate(getStartDateStringFromDaysAgo(1));
        setEndDate(getEndDateStringFromDaysAgo(0));
        break;
      case "week":
        setStartDate(getStartDateStringFromDaysAgo(7));
        setEndDate(getEndDateStringFromDaysAgo(0));
        break;
      case "month":
        setStartDate(getStartDateStringFromDaysAgo(30));
        setEndDate(getEndDateStringFromDaysAgo(0));
        break;
      default:
        break;
    }
  };

  const { data, loading, error } = useGetTopLevelDashboardMetricsNewQuery({
    variables: {
      facilityId,
      startDate:
        setStartTimeForDateRange(new Date(startDate)) ||
        getStartDateFromDaysAgo(7),
      endDate:
        setEndTimeForDateRange(new Date(endDate)) || getEndDateFromDaysAgo(0),
    },
    fetchPolicy: "no-cache",
  });

  if (loading) {
    return <LoadingCard />;
  }

  if (error) {
    throw error;
  }

  if (data === undefined) {
    return <p>Error: Results not found</p>;
  }

  const totalTests = data.topLevelDashboardMetrics?.totalTestCount || 0;
  const positiveTests = data.topLevelDashboardMetrics?.positiveTestCount || 0;
  const negativeTests = totalTests - positiveTests;
  const positivityRate =
    totalTests > 0 ? (positiveTests / totalTests) * 100 : null;

  return (
    <main className="prime-home">
      <div className="grid-container">
        <div className="prime-container card-container margin-top-2">
          <div className="usa-card__header">
            <h2>COVID-19 testing data</h2>
          </div>
          <div id="analytics-page">
            <div className="prime-container padding-3">
              <div className="grid-row grid-gap">
                <div className="grid-col-4">
                  <Dropdown
                    label="Testing facility"
                    options={[
                      {
                        label: "All facilities",
                        value: "",
                      },
                      ...facilities.map((f) => ({
                        label: f.name,
                        value: f.id,
                      })),
                    ]}
                    onChange={updateFacility}
                    selectedValue={facilityId}
                  />
                </div>
                {/* TODO: filter by patient role */}
                <div className="grid-col-4">
                  <Dropdown
                    label="Date range"
                    options={[
                      {
                        label: "Last day (24 hours)",
                        value: "day",
                      },
                      {
                        label: "Last week (7 days)",
                        value: "week",
                      },
                      {
                        label: "Last month (30 days)",
                        value: "month",
                      },
                      {
                        label: "Custom date range",
                        value: "custom",
                      },
                    ]}
                    onChange={updateDateRange}
                    selectedValue={dateRange}
                  />
                </div>
              </div>
              {dateRange === "custom" && (
                <div className="grid-row grid-gap margin-top-2">
                  <div className="grid-col-4">
                    <DatePicker
                      name="startDate"
                      label="Begin"
                      onChange={(date?: string) => {
                        if (date && date.length === 10) {
                          const newDate = new Date(date);
                          setStartDate(
                            setStartTimeForDateRange(
                              newDate
                            ).toLocaleDateString()
                          );
                        }
                      }}
                      noHint
                    />
                  </div>
                  <div className="grid-col-4">
                    <DatePicker
                      name="endDate"
                      label="End"
                      onChange={(date?: string) => {
                        if (date && date.length === 10) {
                          const newDate = new Date(date);
                          setEndDate(
                            setEndTimeForDateRange(newDate).toLocaleDateString()
                          );
                        }
                      }}
                      noHint
                    />
                  </div>
                </div>
              )}
              <h3>{facilityName}</h3>
              <p className="margin-bottom-0">All people tested</p>
              <p className="padding-top-1">{`${startDate} \u2013 ${endDate}`}</p>
              <div className="grid-row grid-gap">
                <div className="grid-col-3">
                  <div className="card display-flex flex-column flex-row">
                    <h2>Tests conducted</h2>
                    <h1>{totalTests}</h1>
                    <p></p>
                  </div>
                </div>
                <div className="grid-col-3">
                  <div className="card display-flex flex-column flex-align-center">
                    <h2>Positive tests</h2>
                    <h1>{positiveTests}</h1>
                    {/* \u2BC6 is down pointing triangle */}
                    <p>
                      {/* <span className="red-pointing-up">{`\u2BC5`} 2</span>{" "}
                      <span className="usa-hint font-ui-md">from last week</span> */}
                    </p>
                  </div>
                </div>
                <div className="grid-col-3">
                  <div className="card display-flex flex-column flex-align-center">
                    <h2>Negative tests</h2>
                    <h1>{negativeTests}</h1>
                    <p></p>
                  </div>
                </div>
                <div className="grid-col-3">
                  <div className="card display-flex flex-column flex-align-center">
                    <h2>Positivity rate</h2>
                    <h1>
                      {positivityRate !== null
                        ? positivityRate.toFixed(1) + "%"
                        : "N/A"}
                    </h1>
                    <p className="font-ui-2xs">
                      Positives <span>÷</span> total tests
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
