package gov.cdc.usds.simplereport.service;

import gov.cdc.usds.simplereport.db.model.DeviceSpecimenType;
import gov.cdc.usds.simplereport.db.model.Facility;
import gov.cdc.usds.simplereport.db.model.PatientAnswers;
import gov.cdc.usds.simplereport.db.model.Person;
import gov.cdc.usds.simplereport.db.model.TestOrder;
import gov.cdc.usds.simplereport.db.model.auxiliary.AskOnEntrySurvey;
import gov.cdc.usds.simplereport.db.model.auxiliary.TestResult;
import gov.cdc.usds.simplereport.db.repository.DeviceSpecimenTypeRepository;
import gov.cdc.usds.simplereport.db.repository.FacilityRepository;
import gov.cdc.usds.simplereport.db.repository.PatientAnswersRepository;
import gov.cdc.usds.simplereport.db.repository.TestEventRepository;
import gov.cdc.usds.simplereport.db.repository.TestOrderRepository;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class RandomDataController {
  private final TestOrderRepository testOrderRepository;
  private final TestEventRepository testEventRepository;
  private final FacilityRepository facilityRepository;
  private final PersonService personService;
  private final DeviceSpecimenTypeRepository deviceSpecimenTypeRepository;
  private final PatientAnswersRepository patientAnswersRepository;

  List<TestResult> results =
      List.of(TestResult.POSITIVE, TestResult.NEGATIVE, TestResult.UNDETERMINED);
  private final Random random = new Random();

  @GetMapping("/generateTests")
  public String generateRandomData(@RequestParam UUID personId, @RequestParam UUID facilityId) {
    generateRandomTests(personId, facilityId);
    return "Done!";
  }

  public void generateRandomTests(UUID personId, UUID facilityId) {
    Person person = personService.getPatientNoPermissionsCheck(personId);
    Facility facility = facilityRepository.findById(facilityId).get();
    List<DeviceSpecimenType> dsts = deviceSpecimenTypeRepository.findAll();

    PatientAnswers askOnEntrySurvey =
        new PatientAnswers(new AskOnEntrySurvey(null, Map.of("fake", true), false, null));
    patientAnswersRepository.save(askOnEntrySurvey);

    for (int i = 0; i < 1000; i++) {
      long ms = -946771200000L + (Math.abs(random.nextLong()) % (70L * 365 * 24 * 60 * 60 * 1000));
      Date randomDate = new Date(ms);
      TestResult randomResult =
          results.get((random.nextInt() & Integer.MAX_VALUE) % results.size());
      DeviceSpecimenType randomDST = dsts.get((random.nextInt() & Integer.MAX_VALUE) % dsts.size());

      TestOrder order = new TestOrder(person, facility);

      order.setAskOnEntrySurvey(askOnEntrySurvey);
      order.setDeviceSpecimen(randomDST);
      order.setResult(randomResult);
      order.setDateTestedBackdate(randomDate);
      order.markComplete();

      order = testOrderRepository.save(order);

      //      TestEvent testEvent = new TestEvent(order, false);
      //      testEventRepository.save(testEvent);
      //
      //      order.setTestEventRef(testEvent);
      //      order = testOrderRepository.save(order);
    }
  }
}
