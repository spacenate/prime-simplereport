package gov.cdc.usds.simplereport.service.dataloader;

import gov.cdc.usds.simplereport.api.model.ApiTestResult;
import gov.cdc.usds.simplereport.db.repository.TestEventRepository;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class PatientLastTestDataLoader extends KeyedDataLoaderFactory<UUID, ApiTestResult> {
  public static final String KEY = "patients[*].lastTest";

  @Override
  public String getKey() {
    return KEY;
  }

  PatientLastTestDataLoader(TestEventRepository testEventRepository) {
    super(
        patientIds ->
            CompletableFuture.supplyAsync(
                () -> {
                  Map<UUID, ApiTestResult> found =
                      testEventRepository.findLastTestsByPatient(patientIds).stream()
                          .map(ApiTestResult::new)
                          .collect(Collectors.toMap(ApiTestResult::getPatientInternalID, s -> s));
                  return patientIds.stream()
                      .map(te -> found.getOrDefault(te, null))
                      .collect(Collectors.toList());
                }));
  }
}
